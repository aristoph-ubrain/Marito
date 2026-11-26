"use server";

import { revalidatePath } from "next/cache";
import { listarAlas, salvarConfigAlas } from "@/lib/alas";
import { registrarAvisosArea } from "@/lib/avisos";
import { coordenadorDaSessao } from "@/lib/dal";

type Config = { id: string; nivel: number; situacao: "liberada" | "interditada" };

export async function aplicarAlas(config: Config[]): Promise<{ ok: true; msg: string } | { ok: false; erro: string }> {
  const quem = await coordenadorDaSessao();
  if (!quem) return { ok: false, erro: "Acesso restrito à coordenação." };
  if (!Array.isArray(config) || config.length > 20) return { ok: false, erro: "Configuração inválida." };

  const antes = await listarAlas();
  const editaveis = new Set(antes.filter((a) => !a.secreta).map((a) => a.id));
  for (const c of config) {
    if (!editaveis.has(c?.id)) return { ok: false, erro: "Ala inválida." };
    if (!Number.isInteger(c.nivel) || c.nivel < 1 || c.nivel > 999) return { ok: false, erro: "Nível inválido." };
    if (c.situacao !== "liberada" && c.situacao !== "interditada") return { ok: false, erro: "Situação inválida." };
  }
  await salvarConfigAlas(config.map((c) => ({ id: c.id, nivel: c.nivel, situacao: c.situacao })));
  // Avisos para os pacientes: o que mudou em cada área.
  const dois = (n: number) => String(n).padStart(2, "0");
  const textos: string[] = [];
  for (const c of config) {
    const a = antes.find((x) => x.id === c.id);
    if (!a) continue;
    const nome = a.nome.charAt(0) + a.nome.slice(1).toLowerCase();
    if (a.situacao !== c.situacao) textos.push(c.situacao === "interditada" ? `${nome} interditada pela coordenação` : `${nome} liberada a partir do nível ${dois(c.nivel)}`);
    else if (a.nivel !== c.nivel) textos.push(`${nome}: nível mínimo agora é ${dois(c.nivel)}`);
  }
  await registrarAvisosArea(textos);
  revalidatePath("/coordenacao/alas");
  revalidatePath("/alas");
  revalidatePath("/missoes");
  return { ok: true, msg: `${config.length} alteração(ões) aplicada(s). Os pacientes recebem um aviso.` };
}
