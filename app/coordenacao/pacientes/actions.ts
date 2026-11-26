"use server";

import { revalidatePath } from "next/cache";
import { coordenadorDaSessao } from "@/lib/dal";
import { listarHistorico } from "@/lib/historico";
import { montarDias, type DiaVisto } from "@/lib/livro";
import { buscarPaciente, colecaoPacientes } from "@/lib/pacientes";

type Resposta = { ok: true; msg: string } | { ok: false; erro: string };

export async function salvarDiagnostico(prontuario: string, texto: string): Promise<Resposta> {
  const quem = await coordenadorDaSessao();
  if (!quem) return { ok: false, erro: "Acesso restrito à coordenação." };
  const t = typeof texto === "string" ? texto.trim().slice(0, 200) : "";
  if (!/^\d{4}$/.test(String(prontuario)) || !t) return { ok: false, erro: "Diagnóstico inválido." };
  const r = await (await colecaoPacientes()).updateOne({ prontuario }, { $set: { diagnostico: t } });
  if (!r.matchedCount) return { ok: false, erro: "Paciente não encontrado." };
  revalidatePath("/coordenacao/pacientes");
  revalidatePath("/ficha");
  return { ok: true, msg: "Diagnóstico atualizado." };
}

export async function anotar(prontuario: string, texto: string): Promise<Resposta> {
  const quem = await coordenadorDaSessao();
  if (!quem) return { ok: false, erro: "Acesso restrito à coordenação." };
  const t = typeof texto === "string" ? texto.trim().slice(0, 1000) : "";
  if (!/^\d{4}$/.test(String(prontuario)) || !t) return { ok: false, erro: "Escreva a anotação." };
  const r = await (await colecaoPacientes()).updateOne(
    { prontuario },
    { $push: { anotacoes: { em: new Date(), autor: quem.nome, texto: t } } },
  );
  if (!r.matchedCount) return { ok: false, erro: "Paciente não encontrado." };
  revalidatePath("/coordenacao/pacientes");
  revalidatePath("/ficha");
  revalidatePath("/historico");
  return { ok: true, msg: "Anotação registrada na ficha e no histórico." };
}

/** Livro de ocorrências de um paciente, para consulta da coordenação (somente leitura). */
export async function historicoDoPaciente(prontuario: string): Promise<{ ok: true; dias: DiaVisto[] } | { ok: false; erro: string }> {
  const quem = await coordenadorDaSessao();
  if (!quem) return { ok: false, erro: "Acesso restrito à coordenação." };
  if (typeof prontuario !== "string" || !/^\d{4}$/.test(prontuario)) return { ok: false, erro: "Prontuário inválido." };
  const p = await buscarPaciente(prontuario);
  if (!p) return { ok: false, erro: "Paciente não encontrado." };
  const registros = await listarHistorico(prontuario, 500);
  return { ok: true, dias: montarDias(registros, p.anotacoes) };
}
