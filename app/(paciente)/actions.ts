"use server";

import { revalidatePath } from "next/cache";
import { alaAcessivel, listarAlas } from "@/lib/alas";
import { CHAVES, ehChave, nomeDe, type ChaveAtributo } from "@/lib/atributos";
import { colecaoConvivio, idVinculo } from "@/lib/convivio";
import { MongoServerError } from "mongodb";
import { prontuarioDaSessao } from "@/lib/dal";
import { calcularPendencias, ganharXp, mutarPaciente } from "@/lib/jogo";
import { buscarOrdem, nivelDaOrdem } from "@/lib/ordens";
import { buscarPaciente } from "@/lib/pacientes";
import { registrar } from "@/lib/historico";
import { colecaoPacientes } from "@/lib/pacientes";
import { ehOpcaoFoto } from "@/components/Figurinha";
import { LIMITE_RELATO, validarRelato } from "@/lib/cadastro";
import { enviarBilhete, LIMITE_BILHETE, rasgarBilhete } from "@/lib/bilhetes";
import { BONUS_PRIMEIRA_VISITA_ALA, diaBrasilia, dois } from "@/lib/regras";

export type Resposta = { ok: true; msg?: string } | { ok: false; erro: string };
const SEM_SESSAO: Resposta = { ok: false, erro: "Sessão expirada. Entre novamente." };

/* ---------- Atributos ---------- */

export async function registrarAvaliacao(alocacao: Record<string, unknown>): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;

  const valores: Partial<Record<ChaveAtributo, number>> = {};
  for (const [k, v] of Object.entries(alocacao ?? {})) {
    if (!ehChave(k) || typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 1000)
      return { ok: false, erro: "Distribuição inválida." };
    if (v > 0) valores[k] = v;
  }
  const total = Object.values(valores).reduce((s, n) => s + (n ?? 0), 0);
  if (total === 0) return { ok: false, erro: "Nenhum ponto distribuído." };

  const r = await mutarPaciente(prontuario, (p, agora) => {
    if (total > p.pontos) return { erro: "Pontos insuficientes. Recarregue a página." };
    const atributos = { ...p.atributos };
    for (const c of CHAVES) atributos[c] += valores[c] ?? 0;
    const resumo = CHAVES.filter((c) => valores[c]).map((c) => `+${valores[c]} ${nomeDe(c)}`).join(", ");
    return {
      set: { atributos, pontos: p.pontos - total },
      historico: [{ em: agora, tipo: "ev", codigo: "EV-AV", texto: `Avaliação registrada: ${resumo}.` }],
    };
  });
  if (!r.ok) return { ok: false, erro: r.erro };
  revalidatePath("/", "layout");
  return { ok: true, msg: "Avaliação registrada." };
}

/* ---------- Foto da ficha ---------- */

export async function escolherFoto(opcao: number): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  if (!ehOpcaoFoto(opcao)) return { ok: false, erro: "Opção de foto inválida." };
  await (await colecaoPacientes()).updateOne({ prontuario }, { $set: { foto: opcao } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** O paciente reescreve o próprio relato de entrada (o diagnóstico continua com a coordenação). */
export async function editarRelato(texto: string): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  const relato = typeof texto === "string" ? texto.replace(/\r\n/g, "\n").trim() : "";
  const erro = validarRelato(relato);
  if (erro) return { ok: false, erro };
  const r = await (await colecaoPacientes()).updateOne({ prontuario }, { $set: { relato: relato.slice(0, LIMITE_RELATO) } });
  if (!r.matchedCount) return SEM_SESSAO;
  if (r.modifiedCount) await registrar(prontuario, [{ em: new Date(), tipo: "ev", codigo: "RL", texto: "Relato de entrada reescrito pelo paciente." }]);
  revalidatePath("/ficha");
  revalidatePath("/historico");
  revalidatePath("/coordenacao/pacientes");
  return { ok: true, msg: "Relato atualizado." };
}

/* ---------- Missões ---------- */

export async function iniciarMissao(codigo: string): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  if (typeof codigo !== "string") return { ok: false, erro: "Missão inválida." };

  const ordem = await buscarOrdem(codigo);
  if (!ordem || ordem.situacao !== "pub") return { ok: false, erro: "Esta ordem não está mais disponível." };
  const ala = (await listarAlas()).find((a) => a.nome === ordem.ala);

  const r = await mutarPaciente(prontuario, (p, agora) => {
    // Aplica primeiro o que estiver pendente (missão anterior terminada, virada do dia).
    const pend = calcularPendencias(p, agora);
    const atual = pend && !("erro" in pend) ? { ...p, ...pend.set } : p;

    if (atual.emCurso) return { erro: "Já existe uma atividade em andamento." };
    if (!ala) return { erro: "Ala da ordem não encontrada. Procure a coordenação." };
    if (!alaAcessivel(ala, atual.nivel)) return { erro: `Acesso à ${ala.nome} não autorizado.` };
    if (atual.nivel < nivelDaOrdem(ordem)) return { erro: `Nível insuficiente: esta ordem pede nível ${dois(nivelDaOrdem(ordem))}.` };

    return {
      set: {
        ...(pend && !("erro" in pend) ? pend.set : {}),
        emCurso: { codigo: ordem.codigo, titulo: ordem.titulo, inicio: agora, duracao: ordem.duracao, xp: ordem.xp },
      },
      historico: pend && !("erro" in pend) ? pend.historico : undefined,
      depois: pend && !("erro" in pend) ? pend.depois : undefined,
    };
  });
  if (!r.ok) return { ok: false, erro: r.erro };
  if (ala) await visitar(prontuario, ala.nome);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function interromperMissao(): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  const r = await mutarPaciente(prontuario, (p, agora) => {
    if (!p.emCurso) return null;
    // Se já terminou, conclui em vez de interromper.
    const pend = calcularPendencias(p, agora);
    if (pend && !("erro" in pend) && pend.set.emCurso === null) return pend;
    return { set: { emCurso: null } };
  });
  if (!r.ok) return { ok: false, erro: r.erro };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Chamado pelo cronômetro do navegador ao zerar: o servidor confere o horário e conclui. */
export async function sincronizar(): Promise<Resposta & { restanteMs?: number }> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  const r = await mutarPaciente(prontuario, calcularPendencias);
  if (!r.ok) return { ok: false, erro: r.erro };
  const em = r.paciente.emCurso;
  if (em) {
    // Ainda não terminou pelo relógio do servidor: devolve quanto falta, sem revalidar.
    const restanteMs = new Date(em.inicio).getTime() + em.duracao * 1000 - Date.now();
    if (restanteMs > 0) return { ok: true, restanteMs };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------- Alas ---------- */

/**
 * Leva o paciente para a ala (muda a localização atual).
 * Na primeira entrada em cada ala: +200 XP, uma única vez por ala.
 */
async function visitar(prontuario: string, nomeAla: string): Promise<number> {
  let ganho = 0;
  const r = await mutarPaciente(prontuario, (p, agora) => {
    ganho = 0; // recalculado a cada tentativa
    const primeira = !p.alasVisitadas.includes(nomeAla);
    if (!primeira && p.local === nomeAla) return null;
    if (!primeira) return { set: { local: nomeAla } };
    const g = ganharXp(p, BONUS_PRIMEIRA_VISITA_ALA, agora);
    ganho = BONUS_PRIMEIRA_VISITA_ALA;
    return {
      set: { ...g.campos, local: nomeAla, alasVisitadas: [...p.alasVisitadas, nomeAla] },
      historico: [
        { em: agora, tipo: "ac", codigo: "AC-V", texto: `Primeira entrada: ${nomeAla}.`, xp: BONUS_PRIMEIRA_VISITA_ALA, diaBrasilia },
        ...g.registros,
      ],
    };
  });
  return r.ok ? ganho : 0;
}

export async function entrarNaAla(id: string): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  const ala = (await listarAlas()).find((a) => a.id === id);
  const p = await buscarPaciente(prontuario);
  if (!ala || !p) return { ok: false, erro: "Ala não encontrada." };
  if (!alaAcessivel(ala, p.nivel)) return { ok: false, erro: ala.secreta ? "Este setor não existe. Solicitação registrada." : "Acesso não autorizado." };
  const ganho = await visitar(prontuario, ala.nome);
  revalidatePath("/", "layout");
  const onde = ala.secreta ? "um setor que não consta na planta" : ala.nome;
  return { ok: true, msg: ganho ? `Você está em ${onde}. Primeira entrada: +${ganho} XP.` : `Você está em ${onde}.` };
}

/* ---------- Convívio ---------- */

export async function solicitarConvivio(numero: string): Promise<Resposta> {
  const eu = await prontuarioDaSessao();
  if (!eu) return SEM_SESSAO;
  const n = typeof numero === "string" ? numero.trim() : "";
  if (!/^\d{4}$/.test(n)) return { ok: false, erro: "Informe os 4 dígitos do prontuário." };
  if (n === eu) return { ok: false, erro: "Este é o seu prontuário." };
  if (n === "0112") return { ok: false, erro: "Prontuário sem internação registrada." };
  if (!(await buscarPaciente(n))) return { ok: false, erro: "Prontuário não encontrado." };

  const col = await colecaoConvivio();
  const _id = idVinculo(eu, n);
  const existente = await col.findOne({ _id });
  if (existente?.estado === "aceito") return { ok: false, erro: "Paciente já está no convívio." };
  if (existente?.de === eu) return { ok: false, erro: "Solicitação já enviada." };
  if (existente?.de === n) {
    // O outro já tinha pedido: aceitar direto.
    const r = await col.updateOne({ _id, estado: "pendente" }, { $set: { estado: "aceito" } });
    if (r.modifiedCount === 1) await registrarConvivio(eu, n);
    revalidatePath("/convivio");
    return { ok: true, msg: "Vocês já estão no convívio." };
  }
  try {
    await col.insertOne({ _id, de: eu, para: n, estado: "pendente", criadoEm: new Date() });
  } catch (e) {
    if (e instanceof MongoServerError && e.code === 11000) return { ok: false, erro: "Solicitação já registrada." };
    throw e;
  }
  revalidatePath("/convivio");
  return { ok: true, msg: "Solicitação enviada ao paciente." };
}

export async function responderConvivio(de: string, aceitar: boolean): Promise<Resposta> {
  const eu = await prontuarioDaSessao();
  if (!eu) return SEM_SESSAO;
  if (typeof de !== "string" || !/^\d{4}$/.test(de)) return { ok: false, erro: "Solicitação inválida." };

  if (de === "0112") {
    // O pedido do 0112 não vem de um paciente real: é parte da narrativa.
    let novo = false;
    await mutarPaciente(eu, (p) => {
      novo = false;
      if (aceitar) {
        if (p.aceitou0112) return null;
        novo = true;
        return { set: { aceitou0112: true } };
      }
      return { set: { recusou0112: diaBrasilia(new Date()) } };
    });
    if (novo) await registrar(eu, [{ em: new Date(), tipo: "cv", codigo: "CV-0112", texto: "Convívio aceito: Pront. 0112. Sem internação registrada." }]);
    revalidatePath("/convivio");
    return { ok: true };
  }

  const col = await colecaoConvivio();
  const filtro = { _id: idVinculo(de, eu), de, para: eu, estado: "pendente" as const };
  if (aceitar) {
    const r = await col.updateOne(filtro, { $set: { estado: "aceito" } });
    if (r.modifiedCount !== 1) return { ok: false, erro: "Solicitação não encontrada." };
    await registrarConvivio(eu, de);
  } else {
    const r = await col.deleteOne(filtro);
    if (r.deletedCount !== 1) return { ok: false, erro: "Solicitação não encontrada." };
  }
  revalidatePath("/convivio");
  return { ok: true };
}

async function registrarConvivio(a: string, b: string) {
  const [pa, pb] = await Promise.all([buscarPaciente(a), buscarPaciente(b)]);
  const agora = new Date();
  await registrar(a, [{ em: agora, tipo: "cv", codigo: `CV-${b}`, texto: `Convívio aceito: Pront. ${b}${pb ? ` · ${pb.nome}` : ""}.` }]);
  await registrar(b, [{ em: agora, tipo: "cv", codigo: `CV-${a}`, texto: `Convívio aceito: Pront. ${a}${pa ? ` · ${pa.nome}` : ""}.` }]);
}

/* ---------- Bilhetes ---------- */

export async function escreverBilhete(para: string, texto: string): Promise<Resposta> {
  const eu = await prontuarioDaSessao();
  if (!eu) return SEM_SESSAO;
  const p = typeof para === "string" ? para.trim() : "";
  if (!/^\d{4}$/.test(p) || p === eu) return { ok: false, erro: "Escolha um paciente do seu convívio." };
  const t = typeof texto === "string" ? texto.replace(/\s+/g, " ").trim() : "";
  if (!t) return { ok: false, erro: "Escreva o bilhete antes de enviar." };
  if (t.length > LIMITE_BILHETE) return { ok: false, erro: `O bilhete pode ter no máximo ${LIMITE_BILHETE} caracteres.` };
  const erro = await enviarBilhete(eu, p, t);
  if (erro) return { ok: false, erro };
  revalidatePath("/convivio", "layout");
  return { ok: true, msg: "Bilhete dobrado e entregue." };
}

export async function rasgar(id: string): Promise<Resposta> {
  const eu = await prontuarioDaSessao();
  if (!eu) return SEM_SESSAO;
  if (typeof id !== "string") return { ok: false, erro: "Bilhete não encontrado." };
  const erro = await rasgarBilhete(eu, id);
  if (erro) return { ok: false, erro };
  revalidatePath("/convivio", "layout");
  return { ok: true };
}
