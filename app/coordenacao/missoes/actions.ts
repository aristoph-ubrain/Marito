"use server";

import { revalidatePath } from "next/cache";
import { banco } from "@/lib/db";
import { proximoCodigo, type Ordem } from "@/lib/ordens";

type DadosOrdem = Pick<Ordem, "titulo" | "ala" | "descricao" | "requisitos" | "xp" | "duracao">;
type Resultado = { ok: true; codigo: string } | { ok: false; erro: string };

function atualizarTelas() {
  revalidatePath("/coordenacao/missoes");
  revalidatePath("/missoes");
}

export async function salvarOrdem(dados: DadosOrdem, publicar: boolean): Promise<Resultado> {
  // Nunca confie só na validação do navegador: valide de novo aqui.
  if (!dados.titulo.trim()) return { ok: false, erro: "Informe o título da ordem." };
  if (!dados.requisitos.length) return { ok: false, erro: "Inclua ao menos um requisito." };
  if (new Set(dados.requisitos.map((r) => r.atributo)).size !== dados.requisitos.length)
    return { ok: false, erro: "Há atributos repetidos nos requisitos." };

  const codigo = await proximoCodigo();
  const db = await banco();
  await db.collection<Ordem>("ordens").insertOne({
    ...dados,
    titulo: dados.titulo.trim(),
    codigo,
    situacao: publicar ? "pub" : "ras",
    vezes: 0,
    autor: "Dr. ██████", // trocar pelo usuário logado quando o login estiver pronto
    criadaEm: new Date(),
  });

  atualizarTelas();
  return { ok: true, codigo };
}

export async function alternarSituacao(codigo: string): Promise<Resultado> {
  const col = (await banco()).collection<Ordem>("ordens");
  const ordem = await col.findOne({ codigo });
  if (!ordem) return { ok: false, erro: `${codigo}: ordem não encontrada.` };
  if (ordem.protegida)
    return { ok: false, erro: `${codigo}: ordem protegida. Não foi possível arquivar. Responsável não identificado.` };

  await col.updateOne({ codigo }, { $set: { situacao: ordem.situacao === "pub" ? "arq" : "pub" } });
  atualizarTelas();
  return { ok: true, codigo };
}
