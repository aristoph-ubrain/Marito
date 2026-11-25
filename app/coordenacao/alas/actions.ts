"use server";

import { revalidatePath } from "next/cache";
import { listarAlas, salvarConfigAlas } from "@/lib/alas";
import { coordenadorDaSessao } from "@/lib/dal";

type Config = { id: string; nivel: number; situacao: "liberada" | "interditada" };

export async function aplicarAlas(config: Config[]): Promise<{ ok: true; msg: string } | { ok: false; erro: string }> {
  const quem = await coordenadorDaSessao();
  if (!quem) return { ok: false, erro: "Acesso restrito à coordenação." };
  if (!Array.isArray(config) || config.length > 20) return { ok: false, erro: "Configuração inválida." };

  const editaveis = new Set((await listarAlas()).filter((a) => !a.secreta).map((a) => a.id));
  for (const c of config) {
    if (!editaveis.has(c?.id)) return { ok: false, erro: "Ala inválida." };
    if (!Number.isInteger(c.nivel) || c.nivel < 1 || c.nivel > 999) return { ok: false, erro: "Nível inválido." };
    if (c.situacao !== "liberada" && c.situacao !== "interditada") return { ok: false, erro: "Situação inválida." };
  }
  await salvarConfigAlas(config.map((c) => ({ id: c.id, nivel: c.nivel, situacao: c.situacao })));
  revalidatePath("/coordenacao/alas");
  revalidatePath("/alas");
  revalidatePath("/missoes");
  return { ok: true, msg: `${config.length} alteração(ões) aplicada(s). Valem a partir do próximo acesso dos pacientes.` };
}
