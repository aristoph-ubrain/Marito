/**
 * Motor do jogo no servidor: aplica as regras do MVP sobre o paciente.
 * Toda escrita que mexe em XP, nível, pontos ou missões passa por `mutarPaciente`,
 * que usa o campo `versao` para evitar que duas requisições simultâneas se sobrescrevam.
 */
import { banco } from "./db";
import { registrar, type NovoRegistro } from "./historico";
import { buscarPaciente, colecaoPacientes, normalizar, type Paciente, type PacienteJogo } from "./pacientes";
import {
  aplicarXp,
  BONUS_ACESSO_DIARIO,
  diaBrasilia,
  dois,
  missaoConcluida,
  PONTOS_POR_NIVEL,
} from "./regras";

export type Mudanca = { set: Partial<Paciente>; historico?: NovoRegistro[]; depois?: () => Promise<void> };
export type ResultadoMudanca = Mudanca | { erro: string } | null; // null = nada a mudar

/**
 * Lê o paciente, calcula a mudança e grava só se ninguém alterou o documento no meio.
 * Em caso de conflito, tenta de novo com o documento atualizado.
 */
export async function mutarPaciente(
  prontuario: string,
  calcular: (p: PacienteJogo, agora: Date) => ResultadoMudanca,
): Promise<{ ok: true; paciente: PacienteJogo } | { ok: false; erro: string }> {
  const col = await colecaoPacientes();
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const bruto = await col.findOne({ prontuario }, { projection: { _id: 0 } });
    if (!bruto) return { ok: false, erro: "Paciente não encontrado." };
    const p = normalizar(bruto);
    const r = calcular(p, new Date());
    if (r === null) return { ok: true, paciente: p };
    if ("erro" in r) return { ok: false, erro: r.erro };

    const filtro = bruto.versao === undefined ? { prontuario, versao: { $exists: false } } : { prontuario, versao: bruto.versao };
    const res = await col.updateOne(filtro, { $set: { ...r.set, versao: p.versao + 1 } });
    if (res.modifiedCount === 1) {
      if (r.historico?.length) await registrar(prontuario, r.historico);
      if (r.depois) await r.depois();
      return { ok: true, paciente: { ...p, ...r.set, versao: p.versao + 1 } as PacienteJogo };
    }
  }
  return { ok: false, erro: "O sistema está ocupado. Tente novamente." };
}

/** Soma um ganho de XP e devolve os campos alterados + registros de subida de nível. */
export function ganharXp(
  p: Pick<PacienteJogo, "nivel" | "xp" | "pontos" | "xpTotal">,
  ganho: number,
  em: Date,
): { campos: Pick<PacienteJogo, "nivel" | "xp" | "pontos" | "xpTotal">; registros: NovoRegistro[] } {
  const r = aplicarXp(p, ganho);
  const registros: NovoRegistro[] = [];
  for (let n = p.nivel; n < r.nivel; n++) {
    registros.push({
      em: new Date(em.getTime() + 1),
      tipo: "ev",
      codigo: `EV-N${dois(n + 1)}`,
      texto: `Nível ${dois(n)} → ${dois(n + 1)}. +${PONTOS_POR_NIVEL} pontos de atributo.`,
    });
  }
  return { campos: { nivel: r.nivel, xp: r.xp, pontos: r.pontos, xpTotal: p.xpTotal + ganho }, registros };
}

/**
 * Pendências que dependem do tempo: missão que terminou (inclusive com o jogo fechado),
 * virada do dia (zera o limite de missões) e bônus de acesso diário.
 */
export function calcularPendencias(p: PacienteJogo, agora: Date): ResultadoMudanca {
  const hoje = diaBrasilia(agora);
  let estado = { nivel: p.nivel, xp: p.xp, pontos: p.pontos, xpTotal: p.xpTotal };
  const set: Partial<Paciente> = {};
  const historico: NovoRegistro[] = [];
  let missoesHoje = p.missoesHoje.dia === hoje ? p.missoesHoje : { dia: hoje, n: 0 };
  let ordemConcluida: string | null = null;

  if (missoesHoje !== p.missoesHoje) set.missoesHoje = missoesHoje;

  if (p.emCurso && missaoConcluida(new Date(p.emCurso.inicio), p.emCurso.duracao, agora)) {
    const fim = new Date(new Date(p.emCurso.inicio).getTime() + p.emCurso.duracao * 1000);
    const g = ganharXp(estado, p.emCurso.xp, fim);
    estado = g.campos;
    // Conta no limite do dia em que a missão terminou; se terminou ontem, não ocupa vaga de hoje.
    if (diaBrasilia(fim) === hoje) missoesHoje = { dia: hoje, n: missoesHoje.n + 1 };
    ordemConcluida = p.emCurso.codigo;
    historico.push(
      { em: fim, tipo: "os", codigo: p.emCurso.codigo, texto: `${p.emCurso.titulo} concluída.`, xp: p.emCurso.xp },
      ...g.registros,
    );
    Object.assign(set, {
      emCurso: null,
      missoesHoje,
      concluidas: { ...p.concluidas, [p.emCurso.codigo]: (p.concluidas[p.emCurso.codigo] ?? 0) + 1 },
    });
  }

  if (p.bonusDia !== hoje) {
    const g = ganharXp(estado, BONUS_ACESSO_DIARIO, agora);
    estado = g.campos;
    historico.push({ em: agora, tipo: "ev", codigo: "BN-D", texto: "Acesso diário registrado.", xp: BONUS_ACESSO_DIARIO }, ...g.registros);
    set.bonusDia = hoje;
  }

  if (!Object.keys(set).length) return null;
  Object.assign(set, estado);
  const codigo = ordemConcluida;
  return {
    set,
    historico,
    depois: codigo
      ? async () => {
          await (await banco()).collection("ordens").updateOne({ codigo }, { $inc: { vezes: 1 } });
        }
      : undefined,
  };
}

/** Lê o paciente já com as pendências aplicadas. */
export async function sincronizarPaciente(prontuario: string): Promise<PacienteJogo | null> {
  const r = await mutarPaciente(prontuario, calcularPendencias);
  if (r.ok) return r.paciente;
  // Muitos conflitos seguidos (várias abas): mostra o estado atual; as pendências entram no próximo acesso.
  return buscarPaciente(prontuario);
}
