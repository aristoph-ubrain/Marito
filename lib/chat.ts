/**
 * Canal geral (chat). Mensagens ficam 24 h no banco (índice TTL apaga sozinho).
 */
import { ObjectId } from "mongodb";
import { banco, umaVez } from "./db";
import { horaBrasilia } from "./regras";

export const LIMITE_MENSAGEM = 200;
export const INTERVALO_ENVIO_S = 3;
const DURACAO_S = 24 * 60 * 60;

export type TipoMensagem = "paciente" | "coordenacao" | "sistema" | "fantasma";
type Doc = { _id?: ObjectId; em: Date; tipo: TipoMensagem; autor: string; prontuario?: string; texto: string; dia?: string };

/** Mensagem como vai para o navegador (sem dados internos). */
export type MensagemVista = { id: string; em: number; hora: string; tipo: TipoMensagem; autor: string; minha: boolean; texto: string };

async function colecao() {
  const col = (await banco()).collection<Doc>("mensagens");
  await umaVez("idx:mensagens", async () => {
    await col.createIndex({ em: 1 }, { expireAfterSeconds: DURACAO_S });
    await col.createIndex({ tipo: 1, dia: 1 });
  });
  return col;
}

const vista = (d: Doc, eu?: string): MensagemVista => ({
  id: String(d._id),
  em: d.em.getTime(),
  hora: horaBrasilia(d.em),
  tipo: d.tipo,
  autor: d.autor,
  minha: !!eu && d.prontuario === eu,
  texto: d.texto,
});

/** Limpa o texto: tira quebras de linha e espaços repetidos. */
export function limparTexto(t: unknown): string {
  return typeof t === "string" ? t.replace(/\s+/g, " ").trim() : "";
}

export async function publicar(m: Omit<Doc, "em" | "_id">) {
  await (await colecao()).insertOne({ ...m, em: new Date() });
}

/**
 * Mensagens das últimas 24 h, em ordem. Com `depois`, só as mais novas que esse instante.
 * Também dispara a mensagem do "████████", uma a cada 2 horas (narrativa).
 */
export async function listarMensagens(eu?: string, depois?: number): Promise<MensagemVista[]> {
  const col = await colecao();
  await talvezFantasma(col);
  const limite = new Date(Date.now() - DURACAO_S * 1000);
  const desde = depois && depois > limite.getTime() ? new Date(depois) : limite;
  const docs = await col
    .find({ em: { $gt: desde } })
    .sort({ em: -1 })
    .limit(300)
    .toArray();
  return docs.reverse().map((d) => vista(d, eu));
}

const FALAS_FANTASMA = [
  "estou no quarto ao lado",
  "a escada desce mais do que sobe",
  "alguém deixou a luz da lavanderia acesa pra mim",
  "eu também fui internado no dia 25",
  "não precisa responder. eu sei onde vocês estão",
  "o quarto 112 está mais frio hoje",
  "a contagem vai dar um a mais de novo",
  "quem apagou a luz do corredor?",
  "conheço o número do seu prontuário",
  "estou esperando no fim da escada",
];

/** O "████████" fala uma vez a cada 2 horas: 01:12, 03:12, 05:12… (horário de Brasília). */
const JANELA_MS = 2 * 60 * 60 * 1000;
// 01:12 em Brasília = 04:12 UTC. O Brasil não tem horário de verão desde 2019, então o deslocamento é fixo.
const INICIO_JANELA_MS = (4 * 60 + 12) * 60 * 1000;

async function talvezFantasma(col: Awaited<ReturnType<typeof colecao>>) {
  const agora = new Date();
  const janela = Math.floor((agora.getTime() - INICIO_JANELA_MS) / JANELA_MS);
  const chave = `j${janela}`; // guardada no campo `dia` (já indexado)
  const fala = FALAS_FANTASMA[janela % FALAS_FANTASMA.length];
  // Uma por janela: a mensagem entra no primeiro acesso ao chat depois do horário.
  await col.updateOne(
    { tipo: "fantasma", dia: chave },
    { $setOnInsert: { tipo: "fantasma", dia: chave, autor: "████████", texto: fala, em: agora } },
    { upsert: true },
  );
}
