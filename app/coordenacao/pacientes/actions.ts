"use server";

import { revalidatePath } from "next/cache";
import { coordenadorDaSessao } from "@/lib/dal";
import { listarHistorico } from "@/lib/historico";
import { montarDias, type DiaVisto } from "@/lib/livro";
import { buscarPaciente, colecaoPacientes } from "@/lib/pacientes";
import { colecaoClasses } from "@/lib/classes";
import { registrar } from "@/lib/historico";

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

/** Reclassifica o paciente (narrativa): carimbo novo na ficha, aviso e linha no histórico. */
export async function reclassificar(prontuario: string, classe: string, motivo: string): Promise<Resposta> {
  const quem = await coordenadorDaSessao();
  if (!quem) return { ok: false, erro: "Acesso restrito à coordenação." };
  if (typeof prontuario !== "string" || !/^\d{4}$/.test(prontuario)) return { ok: false, erro: "Prontuário inválido." };
  const c = typeof classe === "string" ? await (await colecaoClasses()).findOne({ nome: classe }) : null;
  if (!c) return { ok: false, erro: "Classe não encontrada no catálogo." };
  const m = typeof motivo === "string" ? motivo.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  const p = await buscarPaciente(prontuario);
  if (!p) return { ok: false, erro: "Paciente não encontrado." };
  if (p.classe === c.nome) return { ok: false, erro: `O paciente já é ${c.nome}.` };
  const agora = new Date();
  const r = await (await colecaoPacientes()).updateOne(
    { prontuario, classe: p.classe },
    { $set: { classe: c.nome, classeAnterior: p.classe, classeEm: agora, classeMotivo: m }, $inc: { versao: 1 } },
  );
  if (!r.modifiedCount) return { ok: false, erro: "A ficha mudou enquanto você editava. Tente de novo." };
  await registrar(prontuario, [
    { em: agora, tipo: "ev", codigo: "EV-CL", texto: `Reclassificação: ${p.classe} → ${c.nome}.${m ? ` Motivo: ${m}` : ""}` },
  ]);
  revalidatePath("/coordenacao", "layout");
  revalidatePath("/", "layout");
  return { ok: true, msg: `Prontuário ${prontuario} reclassificado como ${c.nome}. O paciente verá o aviso ao entrar.` };
}
