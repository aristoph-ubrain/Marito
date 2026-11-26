"use server";

import { revalidatePath } from "next/cache";
import { NOMES_ALAS } from "@/lib/alas";
import { banco } from "@/lib/db";
import { coordenadorDaSessao } from "@/lib/dal";
import { proximoCodigo, type Ordem } from "@/lib/ordens";

type DadosOrdem = Pick<Ordem, "titulo" | "ala" | "descricao" | "nivel" | "xp" | "duracao">;
type Resultado = { ok: true; codigo: string } | { ok: false; erro: string };

function atualizarTelas() {
  revalidatePath("/coordenacao/missoes");
  revalidatePath("/missoes");
  revalidatePath("/alas");
}

/** Nunca confie só na validação do navegador: tudo é conferido de novo aqui. */
function validar(d: DadosOrdem): string | DadosOrdem {
  const titulo = typeof d?.titulo === "string" ? d.titulo.trim() : "";
  if (!titulo) return "Informe o título da ordem.";
  if (titulo.length > 80) return "Título muito longo (máx. 80).";
  if (!NOMES_ALAS.includes(d.ala)) return "Ala inválida.";
  const descricao = typeof d.descricao === "string" ? d.descricao.trim().slice(0, 500) : "";
  if (!Number.isInteger(d.nivel) || (d.nivel as number) < 1 || (d.nivel as number) > 999) return "Nível mínimo inválido.";
  if (!Number.isInteger(d.xp) || d.xp < 0 || d.xp > 100000) return "Recompensa de XP inválida.";
  if (!Number.isInteger(d.duracao) || d.duracao < 5 || d.duracao > 24 * 60 * 60) return "Duração inválida.";
  return {
    titulo,
    ala: d.ala,
    descricao,
    nivel: d.nivel,
    xp: d.xp,
    duracao: d.duracao,
  };
}

/** Cria uma ordem nova ou, se `codigo` vier preenchido, atualiza a existente. */
export async function salvarOrdem(dados: DadosOrdem, publicar: boolean, codigo?: string): Promise<Resultado> {
  const quem = await coordenadorDaSessao();
  if (!quem) return { ok: false, erro: "Acesso restrito à coordenação." };

  if (codigo !== undefined && (typeof codigo !== "string" || !/^OS-\d{3,}$/.test(codigo))) return { ok: false, erro: "Código inválido." };
  if (typeof publicar !== "boolean") return { ok: false, erro: "Pedido inválido." };
  const v = validar(dados);
  if (typeof v === "string") return { ok: false, erro: v };
  const col = (await banco()).collection<Ordem>("ordens");

  if (codigo) {
    const atual = await col.findOne({ codigo });
    if (!atual) return { ok: false, erro: `${codigo}: ordem não encontrada.` };
    if (atual.protegida) return { ok: false, erro: `${codigo}: ordem protegida. Edição bloqueada.` };
    await col.updateOne({ codigo }, { $set: { ...v, situacao: publicar ? "pub" : "ras", editadaEm: new Date() }, $unset: { requisitos: "" } });
    atualizarTelas();
    return { ok: true, codigo };
  }

  const novo = await proximoCodigo();
  await col.insertOne({
    ...v,
    codigo: novo,
    situacao: publicar ? "pub" : "ras",
    vezes: 0,
    autor: quem.nome,
    criadaEm: new Date(),
  });
  atualizarTelas();
  return { ok: true, codigo: novo };
}

export async function alternarSituacao(codigo: string): Promise<Resultado> {
  const quem = await coordenadorDaSessao();
  if (!quem) return { ok: false, erro: "Acesso restrito à coordenação." };

  const col = (await banco()).collection<Ordem>("ordens");
  const ordem = await col.findOne({ codigo: String(codigo) });
  if (!ordem) return { ok: false, erro: `${codigo}: ordem não encontrada.` };
  if (ordem.protegida)
    return { ok: false, erro: `${codigo}: ordem protegida. Não foi possível arquivar. Responsável não identificado.` };

  await col.updateOne({ codigo: ordem.codigo }, { $set: { situacao: ordem.situacao === "pub" ? "arq" : "pub" } });
  atualizarTelas();
  return { ok: true, codigo: ordem.codigo };
}
