"use server";

import { revalidatePath } from "next/cache";
import { alaAcessivel, listarAlas } from "@/lib/alas";
import { CHAVES, ehChave, nomeDe, type ChaveAtributo } from "@/lib/atributos";
import { buscarPacientes, colecaoConvivio, dispensarSugestao, idVinculo, type EstadoVinculo, type PacientePublico } from "@/lib/convivio";
import { MongoServerError } from "mongodb";
import { prontuarioDaSessao } from "@/lib/dal";
import { calcularPendencias, ganharXp, mutarPaciente } from "@/lib/jogo";
import { buscarOrdem, nivelDaOrdem } from "@/lib/ordens";
import { buscarPaciente } from "@/lib/pacientes";
import { registrar } from "@/lib/historico";
import { listarAvisos, marcarAvisosVistos, type Avisos } from "@/lib/avisos";
import { colecaoPacientes } from "@/lib/pacientes";
import { ehOpcaoFoto } from "@/components/Figurinha";
import { LIMITE_RELATO, validarRelato } from "@/lib/cadastro";
import { enviarBilhete, LIMITE_BILHETE, rasgarBilhete } from "@/lib/bilhetes";
import { BONUS_PRIMEIRA_VISITA_ALA, diaBrasilia, dois } from "@/lib/regras";
import {
  AUTOMACOES,
  automacaoLiberada,
  duracaoComHabilidade,
  ehAutomacao,
  TAMANHO_FILA,
  xpComHabilidade,
  type Automacao,
  type Plano,
} from "@/lib/habilidades";
import type { Ordem } from "@/lib/ordens";
import type { PacienteJogo } from "@/lib/pacientes";
import { ehEntidade, listarEntidades, sortearEntidade, type Raridade } from "@/lib/entidades";

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
      set: { atributos, pontos: p.pontos - total, ultimaDistribuicao: valores },
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

/** Confere se o paciente pode fazer a ordem agora (ala e nível). */
function podeFazer(ordem: Ordem, ala: Awaited<ReturnType<typeof listarAlas>>[number] | undefined, p: Pick<PacienteJogo, "nivel">): string | null {
  if (!ala) return "Ala da ordem não encontrada. Procure a coordenação.";
  if (!alaAcessivel(ala, p.nivel)) return `Acesso à ${ala.nome} não autorizado.`;
  if (p.nivel < nivelDaOrdem(ordem)) return `Nível insuficiente: esta ordem pede nível ${dois(nivelDaOrdem(ordem))}.`;
  return null;
}

/** A ordem como entra em curso ou na fila: duração e XP com as habilidades do paciente. */
const comHabilidades = (ordem: Ordem, p: Pick<PacienteJogo, "atributos">) => ({
  codigo: ordem.codigo,
  ala: ordem.ala,
  titulo: ordem.titulo,
  duracao: duracaoComHabilidade(ordem.duracao, p.atributos),
  xp: xpComHabilidade(ordem.xp, ordem.duracao, p.atributos),
});

async function ordemPublicada(codigo: unknown) {
  if (typeof codigo !== "string") return null;
  const ordem = await buscarOrdem(codigo);
  if (!ordem || ordem.situacao !== "pub") return null;
  const ala = (await listarAlas()).find((a) => a.nome === ordem.ala);
  return { ordem, ala };
}

export async function iniciarMissao(codigo: string): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  const achada = await ordemPublicada(codigo);
  if (!achada) return { ok: false, erro: "Esta ordem não está mais disponível." };
  const { ordem, ala } = achada;

  const r = await mutarPaciente(prontuario, (p, agora, ctx) => {
    // Aplica primeiro o que estiver pendente (missão anterior terminada, virada do dia).
    const pend = calcularPendencias(p, agora, ctx);
    const ok = pend && !("erro" in pend) ? pend : null;
    const atual = ok ? { ...p, ...ok.set } : p;

    if (atual.emCurso) return { erro: "Já existe uma atividade em andamento." };
    const erro = podeFazer(ordem, ala, atual);
    if (erro) return { erro };

    return {
      set: { ...(ok?.set ?? {}), vistoEm: agora, emCurso: { ...comHabilidades(ordem, atual), inicio: agora } },
      historico: ok?.historico,
      depois: ok?.depois,
    };
  });
  if (!r.ok) return { ok: false, erro: r.erro };
  if (ala) await visitar(prontuario, ala.nome);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Põe a ordem na fila (VIT 10). Sem nada em andamento, ela começa na hora. */
export async function enfileirarMissao(codigo: string): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  const achada = await ordemPublicada(codigo);
  if (!achada) return { ok: false, erro: "Esta ordem não está mais disponível." };
  const { ordem, ala } = achada;
  let comecar = false;
  const r = await mutarPaciente(prontuario, (p, agora, ctx) => {
    comecar = false;
    const pend = calcularPendencias(p, agora, ctx);
    const ok = pend && !("erro" in pend) ? pend : null;
    const atual = ok ? { ...p, ...ok.set } : p;
    if (!automacaoLiberada("fila", atual.atributos)) return { erro: "A fila de ordens abre com Vitalidade 10." };
    if (!atual.automacoes.fila) return { erro: "Ligue a fila de ordens em ATRIBUTOS." };
    if (!atual.emCurso) {
      comecar = true;
      return null;
    }
    if (atual.fila.length >= TAMANHO_FILA) return { erro: `A fila já tem ${TAMANHO_FILA} ordens.` };
    const erro = podeFazer(ordem, ala, atual);
    if (erro) return { erro };
    return { set: { ...(ok?.set ?? {}), fila: [...atual.fila, comHabilidades(ordem, atual)] }, historico: ok?.historico, depois: ok?.depois };
  });
  if (!r.ok) return { ok: false, erro: r.erro };
  if (comecar) return iniciarMissao(codigo);
  revalidatePath("/", "layout");
  return { ok: true, msg: `${ordem.codigo} na fila.` };
}

export async function removerDaFila(indice: number): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  if (!Number.isInteger(indice) || indice < 0) return { ok: false, erro: "Ordem não encontrada na fila." };
  const r = await mutarPaciente(prontuario, (p) => {
    if (indice >= p.fila.length) return null;
    return { set: { fila: p.fila.filter((_, i) => i !== indice) } };
  });
  if (!r.ok) return { ok: false, erro: r.erro };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function interromperMissao(): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  const r = await mutarPaciente(prontuario, (p, agora, ctx) => {
    if (!p.emCurso) return null;
    // Se já terminou, conclui em vez de interromper.
    const pend = calcularPendencias(p, agora, ctx);
    if (pend && !("erro" in pend) && pend.set.emCurso !== undefined) return { ...pend, set: { ...pend.set, emCurso: null } };
    // Com a fila ligada, a próxima ordem começa no lugar da interrompida.
    if (p.automacoes.fila && automacaoLiberada("fila", p.atributos) && p.fila.length) {
      const [prox, ...resto] = p.fila;
      return { set: { emCurso: { ...prox, inicio: agora }, fila: resto, vistoEm: agora } };
    }
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
  let mudou = false;
  const r = await mutarPaciente(prontuario, (p, agora, ctx) => {
    const pend = calcularPendencias(p, agora, ctx);
    mudou = !!pend && !("erro" in pend) && pend.set.emCurso !== undefined;
    return pend;
  });
  if (!r.ok) return { ok: false, erro: r.erro };
  const em = r.paciente.emCurso;
  // Missão concluída (e talvez outra já começou pela fila ou repetição): a tela precisa recarregar.
  if (em && !mudou) {
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
    const r = await col.updateOne({ _id, estado: "pendente" }, { $set: { estado: "aceito", aceitoEm: new Date() } });
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
    const r = await col.updateOne(filtro, { $set: { estado: "aceito", aceitoEm: new Date() } });
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

/* ---------- Busca e sugestões de convívio ---------- */

export async function buscarConvivio(termo: string): Promise<(PacientePublico & { estado: EstadoVinculo })[]> {
  const eu = await prontuarioDaSessao();
  if (!eu || typeof termo !== "string") return [];
  return buscarPacientes(eu, termo);
}

export async function dispensar(prontuario: string): Promise<Resposta> {
  const eu = await prontuarioDaSessao();
  if (!eu) return SEM_SESSAO;
  if (typeof prontuario !== "string" || !/^\d{4}$/.test(prontuario)) return { ok: false, erro: "Sugestão inválida." };
  await dispensarSugestao(eu, prontuario);
  revalidatePath("/convivio");
  return { ok: true };
}

/* ---------- Avisos ---------- */

export async function buscarAvisos(): Promise<Avisos | null> {
  const eu = await prontuarioDaSessao();
  if (!eu) return null;
  return listarAvisos(eu);
}

export async function cienteAvisos(): Promise<Resposta> {
  const eu = await prontuarioDaSessao();
  if (!eu) return SEM_SESSAO;
  await marcarAvisosVistos(eu);
  return { ok: true };
}

/* ---------- Habilidades (automações dos marcos) ---------- */

export async function alternarAutomacao(chave: Automacao, ligado: boolean): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  if (!ehAutomacao(chave) || typeof ligado !== "boolean") return { ok: false, erro: "Opção inválida." };
  const r = await mutarPaciente(prontuario, (p) => {
    if (!automacaoLiberada(chave, p.atributos)) {
      const a = AUTOMACOES[chave];
      return { erro: `Abre com ${nomeDe(a.chave)} ${dois(a.marco)}.` };
    }
    if (!!p.automacoes[chave] === ligado) return null;
    return { set: { automacoes: { ...p.automacoes, [chave]: ligado }, ...(chave === "fila" && !ligado ? { fila: [] } : {}) } };
  });
  if (!r.ok) return { ok: false, erro: r.erro };
  // Ao ligar a distribuição automática, os pontos parados já são distribuídos.
  if (ligado && chave === "pontos") await mutarPaciente(prontuario, calcularPendencias);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function escolherPlano(plano: Plano): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  const valido =
    plano && typeof plano === "object" &&
    (plano.tipo === "igual" || plano.tipo === "ultima" || (plano.tipo === "um" && ehChave(plano.chave)));
  if (!valido) return { ok: false, erro: "Plano inválido." };
  const limpo: Plano = plano.tipo === "um" ? { tipo: "um", chave: plano.chave } : { tipo: plano.tipo };
  const r = await mutarPaciente(prontuario, (p) => ({ set: { automacoes: { ...p.automacoes, plano: limpo } } }));
  if (!r.ok) return { ok: false, erro: r.erro };
  revalidatePath("/", "layout");
  return { ok: true, msg: "Plano registrado." };
}

/* ---------- Diário ---------- */

/** O paciente abriu a página nova: some o aviso do diário. */
export async function lerPaginaNova(): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  await (await colecaoPacientes()).updateOne({ prontuario, paginaNova: { $ne: null } }, { $set: { paginaNova: null } });
  revalidatePath("/diario");
  return { ok: true };
}

/* ---------- Entidades (Lua Negra) ---------- */

export type ResultadoInvocacao =
  | { ok: true; id: string; eco: boolean; nome: string; raridade: Raridade; descricao: string }
  | { ok: false; erro: string };

/** Queima uma Lua Negra e invoca uma entidade (sorteio no servidor). */
export async function invocarEntidade(): Promise<ResultadoInvocacao> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const ent = sortearEntidade(Math.random(), Math.random());
  let eco = false;
  const editada = (await listarEntidades()).find((e) => e.id === ent.id) ?? ent;
  const nome = editada.nome;
  const r = await mutarPaciente(prontuario, (p, agora) => {
    if (p.luas < 1) return { erro: "Nenhuma Lua Negra guardada." };
    const vezes = (p.entidades[ent.id] ?? 0) + 1;
    eco = vezes > 1;
    return {
      set: { luas: p.luas - 1, entidades: { ...p.entidades, [ent.id]: vezes }, ...(p.acompanhante ? {} : { acompanhante: ent.id }) },
      historico: [{ em: agora, tipo: "ev", codigo: "EV-ENT", texto: eco ? `Eco de entidade: ${nome} (×${vezes}).` : `Entidade invocada: ${nome}.` }],
    };
  });
  if (!r.ok) return { ok: false, erro: r.erro };
  revalidatePath("/", "layout");
  return { ok: true, id: ent.id, eco, nome, raridade: ent.raridade, descricao: editada.descricao };
}

/** Escolhe a entidade que acompanha a ficha (null = nenhuma). */
export async function escolherAcompanhante(id: string | null): Promise<Resposta> {
  const prontuario = await prontuarioDaSessao();
  if (!prontuario) return SEM_SESSAO;
  if (id !== null && !ehEntidade(id)) return { ok: false, erro: "Entidade inválida." };
  const r = await mutarPaciente(prontuario, (p) => {
    if (id && !p.entidades[id]) return { erro: "Você ainda não invocou esta entidade." };
    if ((p.acompanhante ?? null) === id) return null;
    return { set: { acompanhante: id } };
  });
  if (!r.ok) return { ok: false, erro: r.erro };
  revalidatePath("/", "layout");
  return { ok: true };
}
