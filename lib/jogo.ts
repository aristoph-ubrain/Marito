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
import { CHAVES } from "./atributos";
import { CHANCE_PAGINA } from "./diario-base";
import { paginasPorArea } from "./diario";
import { automacaoLiberada, chanceDobro, distribuirPorPlano, resumoDistribuicao, tetoOfflineMin } from "./habilidades";

/** Dados de fora do paciente que as regras precisam (lidos uma vez por gravação). */
export type Contexto = { paginasPorArea: Record<string, number[]> };
let cacheContexto: { em: number; ctx: Contexto } | null = null;
export async function contextoJogo(): Promise<Contexto> {
  if (cacheContexto && Date.now() - cacheContexto.em < 60_000) return cacheContexto.ctx;
  const ctx = { paginasPorArea: await paginasPorArea() };
  cacheContexto = { em: Date.now(), ctx };
  return ctx;
}
const SEM_CONTEXTO: Contexto = { paginasPorArea: {} };

export type Mudanca = { set: Partial<Paciente>; historico?: NovoRegistro[]; depois?: () => Promise<void> };
export type ResultadoMudanca = Mudanca | { erro: string } | null; // null = nada a mudar

/**
 * Lê o paciente, calcula a mudança e grava só se ninguém alterou o documento no meio.
 * Em caso de conflito, tenta de novo com o documento atualizado.
 */
export async function mutarPaciente(
  prontuario: string,
  calcular: (p: PacienteJogo, agora: Date, ctx: Contexto) => ResultadoMudanca,
): Promise<{ ok: true; paciente: PacienteJogo } | { ok: false; erro: string }> {
  const col = await colecaoPacientes();
  const ctx = await contextoJogo();
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const bruto = await col.findOne({ prontuario }, { projection: { _id: 0 } });
    if (!bruto) return { ok: false, erro: "Paciente não encontrado." };
    const p = normalizar(bruto);
    const r = calcular(p, new Date(), ctx);
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

/** Intervalo mínimo entre gravações de `vistoEm` (evita escrever a cada página aberta). */
const VISTO_A_CADA_MS = 5 * 60 * 1000;
/** Trava de segurança para cadeias muito longas de missões automáticas. */
const MAX_CONCLUSOES = 20000;

/**
 * Pendências que dependem do tempo: missões que terminaram (inclusive com o jogo fechado),
 * automações das habilidades (repetir, fila, pontos), virada do dia e bônus de acesso diário.
 */
export function calcularPendencias(p: PacienteJogo, agora: Date, ctx: Contexto = SEM_CONTEXTO): ResultadoMudanca {
  const hoje = diaBrasilia(agora);
  let estado = { nivel: p.nivel, xp: p.xp, pontos: p.pontos, xpTotal: p.xpTotal };
  const set: Partial<Paciente> = {};
  const historico: NovoRegistro[] = [];
  let missoesHoje = p.missoesHoje.dia === hoje ? p.missoesHoje : { dia: hoje, n: 0 };
  const atr = p.atributos;
  const auto = p.automacoes;

  if (missoesHoje !== p.missoesHoje) set.missoesHoje = missoesHoje;

  // Missões concluídas, encadeadas pela fila (VIT 10) ou pela repetição (AGI 10) até o teto offline.
  let em = p.emCurso;
  let fila = p.fila;
  const limiteAuto = new Date(p.vistoEm).getTime() + tetoOfflineMin(atr) * 60 * 1000;
  const vezesPorOrdem: Record<string, number> = {};
  // Conclusões iguais no mesmo dia viram um lançamento só (com "vezes"), para não lotar o histórico.
  const grupos = new Map<string, NovoRegistro>();
  let acasos: NovoRegistro | null = null;
  let paginas = p.paginas;
  let paginaNova = p.paginaNova ?? null;
  let n = 0;
  while (em && missaoConcluida(new Date(em.inicio), em.duracao, agora) && n++ < MAX_CONCLUSOES) {
    const fim = new Date(new Date(em.inicio).getTime() + em.duracao * 1000);
    const dobro = Math.random() < chanceDobro(atr);
    const vezes = dobro ? 2 : 1;
    const ganho = em.xp * vezes;
    const g = ganharXp(estado, ganho, fim);
    estado = g.campos;
    // Conta no dia em que a missão terminou (só para exibição: não há limite diário).
    if (diaBrasilia(fim) === hoje) missoesHoje = { dia: hoje, n: missoesHoje.n + vezes };
    vezesPorOrdem[em.codigo] = (vezesPorOrdem[em.codigo] ?? 0) + vezes;

    const chave = `${diaBrasilia(fim)}|${em.codigo}`;
    const reg = grupos.get(chave);
    if (reg) Object.assign(reg, { em: fim, xp: (reg.xp ?? 0) + ganho, vezes: (reg.vezes ?? 1) + vezes });
    else {
      const novo: NovoRegistro = { em: fim, tipo: "os", codigo: em.codigo, texto: `${em.titulo} concluída.`, xp: ganho, vezes };
      grupos.set(chave, novo);
      historico.push(novo);
    }
    if (dobro) {
      if (acasos) Object.assign(acasos, { em: fim, vezes: (acasos.vezes ?? 1) + 1 });
      else historico.push((acasos = { em: fim, tipo: "ev", codigo: "EV-SOR", texto: "Acaso: a ordem contou duas vezes.", vezes: 1 }));
    }
    historico.push(...g.registros);

    // Diário: 1% de chance de achar uma página ainda não encontrada da área da ordem.
    const daArea = em.ala ? (ctx.paginasPorArea[em.ala] ?? []).filter((n) => !paginas.some((x) => x.n === n)) : [];
    if (daArea.length && Math.random() < CHANCE_PAGINA) {
      const n = daArea[Math.floor(Math.random() * daArea.length)];
      paginas = [...paginas, { n, em: fim, area: em.ala! }];
      paginaNova = n;
      historico.push({ em: new Date(fim.getTime() + 2), tipo: "ac", codigo: `DI-${dois(n)}`, texto: `Página ${dois(n)} de um diário encontrada (${em.ala}).` });
    }

    // Próxima: primeiro a fila, depois a repetição. Nada começa depois do teto offline.
    const podeAuto = fim.getTime() <= limiteAuto;
    if (podeAuto && auto.fila && automacaoLiberada("fila", atr) && fila.length) {
      const [prox, ...resto] = fila;
      fila = resto;
      em = { ...prox, inicio: fim };
    } else if (podeAuto && auto.repetir && automacaoLiberada("repetir", atr)) {
      em = { ...em, inicio: fim };
    } else em = null;
  }
  if (n > 0) {
    if (paginas !== p.paginas) Object.assign(set, { paginas, paginaNova });
    Object.assign(set, {
      emCurso: em,
      fila,
      missoesHoje,
      concluidas: Object.fromEntries(
        [...new Set([...Object.keys(p.concluidas), ...Object.keys(vezesPorOrdem)])].map((c) => [c, (p.concluidas[c] ?? 0) + (vezesPorOrdem[c] ?? 0)]),
      ),
    });
  }

  if (p.bonusDia !== hoje) {
    const g = ganharXp(estado, BONUS_ACESSO_DIARIO, agora);
    estado = g.campos;
    historico.push({ em: agora, tipo: "ev", codigo: "BN-D", texto: "Acesso diário registrado.", xp: BONUS_ACESSO_DIARIO }, ...g.registros);
    set.bonusDia = hoje;
  }

  // Distribuição automática dos pontos (CON 10).
  if (estado.pontos > 0 && auto.pontos && automacaoLiberada("pontos", atr)) {
    const add = distribuirPorPlano(estado.pontos, atr, auto.plano, p.ultimaDistribuicao);
    const atributos = { ...atr };
    for (const c of CHAVES) atributos[c] += add[c] ?? 0;
    set.atributos = atributos;
    estado = { ...estado, pontos: 0 };
    historico.push({ em: new Date(agora.getTime() + 2), tipo: "ev", codigo: "EV-AV", texto: `Avaliação automática: ${resumoDistribuicao(add)}.` });
  }

  if (agora.getTime() - new Date(p.vistoEm).getTime() > VISTO_A_CADA_MS) set.vistoEm = agora;

  if (!Object.keys(set).length) return null;
  Object.assign(set, estado);
  const ordens = Object.entries(vezesPorOrdem);
  return {
    set,
    historico,
    depois: ordens.length
      ? async () => {
          await (await banco())
            .collection("ordens")
            .bulkWrite(ordens.map(([codigo, vezes]) => ({ updateOne: { filter: { codigo }, update: { $inc: { vezes } } } })));
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
