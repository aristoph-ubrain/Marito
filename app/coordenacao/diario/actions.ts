"use server";

import { revalidatePath } from "next/cache";
import { NOMES_ALAS } from "@/lib/alas";
import { coordenadorDaSessao } from "@/lib/dal";
import { AREA_FIXA, colecaoDiario, ehNumeroPagina, LIMITE_TEXTO_PAGINA } from "@/lib/diario";

type Resposta = { ok: true; msg: string } | { ok: false; erro: string };
const SEM_ACESSO: Resposta = { ok: false, erro: "Acesso restrito à coordenação." };
const nome = (n: number) => (n === 13 ? "Última entrada" : `Página ${String(n).padStart(2, "0")}`);

export async function salvarPagina(dados: { n: number; data: string; area: string; texto: string; outra: boolean }): Promise<Resposta> {
  const quem = await coordenadorDaSessao();
  if (!quem) return SEM_ACESSO;
  if (!dados || !ehNumeroPagina(dados.n)) return { ok: false, erro: "Página inválida." };
  const data = typeof dados.data === "string" ? dados.data.trim().slice(0, 20) : "";
  const texto = typeof dados.texto === "string" ? dados.texto.replace(/\r\n/g, "\n").trim().slice(0, LIMITE_TEXTO_PAGINA) : "";
  const area = AREA_FIXA[dados.n] ?? (typeof dados.area === "string" ? dados.area : "");
  if (!texto) return { ok: false, erro: "A página não pode ficar em branco." };
  if (!AREA_FIXA[dados.n] && !NOMES_ALAS.includes(area)) return { ok: false, erro: "Escolha uma área da planta." };
  await (await colecaoDiario()).updateOne(
    { n: dados.n },
    { $set: { n: dados.n, data, area, texto, outra: !!dados.outra, editadaEm: new Date(), autor: quem.nome } },
    { upsert: true },
  );
  revalidatePath("/coordenacao/diario");
  revalidatePath("/diario");
  return { ok: true, msg: `${nome(dados.n)} salva. Quem já tem a página lê o texto novo.` };
}

/** Volta a página para o texto original do jogo. */
export async function restaurarPagina(n: number): Promise<Resposta> {
  if (!(await coordenadorDaSessao())) return SEM_ACESSO;
  if (!ehNumeroPagina(n)) return { ok: false, erro: "Página inválida." };
  await (await colecaoDiario()).deleteOne({ n });
  revalidatePath("/coordenacao/diario");
  revalidatePath("/diario");
  return { ok: true, msg: `${nome(n)} voltou ao texto original.` };
}
