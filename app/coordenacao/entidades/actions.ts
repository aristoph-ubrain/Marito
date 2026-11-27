"use server";

import { revalidatePath } from "next/cache";
import { coordenadorDaSessao } from "@/lib/dal";
import { colecaoEntidades, ehEntidade, LIMITE_DESCRICAO_ENTIDADE, LIMITE_NOME_ENTIDADE, MAX_LUAS_ENTREGA } from "@/lib/entidades";
import { registrar } from "@/lib/historico";
import { mutarPaciente } from "@/lib/jogo";

type Resposta = { ok: true; msg: string } | { ok: false; erro: string };
const SEM_ACESSO: Resposta = { ok: false, erro: "Acesso restrito à coordenação." };

/** Deixa Luas Negras no leito do paciente (aviso e linha no histórico). */
export async function deixarLuas(prontuario: string, qtd: number): Promise<Resposta> {
  if (!(await coordenadorDaSessao())) return SEM_ACESSO;
  if (typeof prontuario !== "string" || !/^\d{4}$/.test(prontuario)) return { ok: false, erro: "Escolha um paciente." };
  if (!Number.isInteger(qtd) || qtd < 1 || qtd > MAX_LUAS_ENTREGA) return { ok: false, erro: `De 1 a ${MAX_LUAS_ENTREGA} luas por entrega.` };
  const r = await mutarPaciente(prontuario, (p, agora) => ({
    set: { luas: p.luas + qtd, luasRecebidas: [...p.luasRecebidas, { em: agora, origem: "mestre" as const, qtd }].slice(-20) },
  }));
  if (!r.ok) return { ok: false, erro: r.erro };
  await registrar(prontuario, [
    { em: new Date(), tipo: "ac", codigo: "LN-L", texto: qtd === 1 ? "Uma Lua Negra foi deixada no leito." : `${qtd} Luas Negras foram deixadas no leito.` },
  ]);
  revalidatePath("/coordenacao/entidades");
  revalidatePath("/", "layout");
  return { ok: true, msg: `${qtd === 1 ? "1 Lua Negra deixada" : `${qtd} Luas Negras deixadas`} no leito do ${prontuario}.` };
}

export async function salvarEntidade(id: string, nome: string, descricao: string): Promise<Resposta> {
  const quem = await coordenadorDaSessao();
  if (!quem) return SEM_ACESSO;
  if (!ehEntidade(id)) return { ok: false, erro: "Entidade inválida." };
  const n = typeof nome === "string" ? nome.replace(/\s+/g, " ").trim().slice(0, LIMITE_NOME_ENTIDADE) : "";
  const d = typeof descricao === "string" ? descricao.replace(/\s+/g, " ").trim().slice(0, LIMITE_DESCRICAO_ENTIDADE) : "";
  if (!n) return { ok: false, erro: "Dê um nome à entidade." };
  await (await colecaoEntidades()).updateOne({ id }, { $set: { id, nome: n, descricao: d, editadaEm: new Date(), autor: quem.nome } }, { upsert: true });
  revalidatePath("/coordenacao/entidades");
  revalidatePath("/", "layout");
  return { ok: true, msg: "Entidade salva. Quem já a tem vê o texto novo." };
}

export async function restaurarEntidade(id: string): Promise<Resposta> {
  if (!(await coordenadorDaSessao())) return SEM_ACESSO;
  if (!ehEntidade(id)) return { ok: false, erro: "Entidade inválida." };
  await (await colecaoEntidades()).deleteOne({ id });
  revalidatePath("/coordenacao/entidades");
  revalidatePath("/", "layout");
  return { ok: true, msg: "Entidade voltou ao texto original." };
}
