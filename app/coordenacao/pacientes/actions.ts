"use server";

import { revalidatePath } from "next/cache";
import { coordenadorDaSessao } from "@/lib/dal";
import { colecaoPacientes } from "@/lib/pacientes";

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
