/**
 * Bilhetes entre pacientes do mesmo convívio.
 * Regras: chegam na hora, 2 por dia por paciente, somem em 24 h (índice TTL),
 * cada lado pode rasgar o seu. A coordenação não tem acesso aos bilhetes.
 */
import { ObjectId } from "mongodb";
import { colecaoConvivio, idVinculo } from "./convivio";
import { banco, umaVez } from "./db";
import { colecaoPacientes } from "./pacientes";
import { diaBrasilia, horaBrasilia } from "./regras";

export const LIMITE_BILHETE = 200;
export const BILHETES_POR_DIA = 2;
const VALIDADE_S = 24 * 60 * 60;

type Doc = {
  _id?: ObjectId;
  de: string;
  para: string;
  texto: string;
  em: Date;
  lidoEm?: Date;
  rasgadoDe?: boolean;
  rasgadoPara?: boolean;
  /** Só no bilhete do 0112: o dia dele e quantas vezes foi rasgado. */
  dia?: string;
  rasgos?: number;
};

export type BilheteVisto = {
  id: string;
  outro: string; // prontuário de quem mandou (recebidos) ou para quem foi (enviados)
  nome: string;
  texto: string;
  hora: string;
  hoje: boolean;
  lido: boolean;
  fantasma: boolean;
};

async function colecao() {
  const col = (await banco()).collection<Doc>("bilhetes");
  await umaVez("idx:bilhetes", async () => {
    await col.createIndex({ em: 1 }, { expireAfterSeconds: VALIDADE_S });
    await col.createIndex({ para: 1, em: -1 });
    await col.createIndex({ de: 1, em: -1 });
  });
  return col;
}

/** Início do dia em Brasília (UTC−3 fixo, sem horário de verão). */
function inicioDoDia(agora: Date): Date {
  const [a, m, d] = diaBrasilia(agora).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 3));
}

const FALAS_0112 = [
  "deixei um bilhete debaixo do seu travesseiro. não esse. o outro.",
  "não adianta rasgar.",
  "eu tenho as outras metades.",
];

/** O 0112 deixa um bilhete por dia, depois das 03:17, para quem aceitou o convívio dele. */
async function talvez0112(col: Awaited<ReturnType<typeof colecao>>, eu: string) {
  const agora = new Date();
  if (horaBrasilia(agora) < "03:17") return;
  const p = await (await colecaoPacientes()).findOne({ prontuario: eu }, { projection: { aceitou0112: 1 } });
  if (!p?.aceitou0112) return;
  const dia = diaBrasilia(agora);
  await col.updateOne(
    { de: "0112", para: eu, dia },
    { $setOnInsert: { de: "0112", para: eu, dia, texto: FALAS_0112[0], em: agora, rasgos: 0 } },
    { upsert: true },
  );
}

export async function enviadosHoje(eu: string): Promise<number> {
  return (await colecao()).countDocuments({ de: eu, em: { $gte: inicioDoDia(new Date()) } });
}

export async function naoLidos(eu: string): Promise<number> {
  const col = await colecao();
  await talvez0112(col, eu);
  return col.countDocuments({ para: eu, lidoEm: { $exists: false }, rasgadoPara: { $ne: true } });
}

/** Recebidos e enviados do paciente (sem os que ele rasgou). */
export async function listarBilhetes(eu: string) {
  const col = await colecao();
  await talvez0112(col, eu);
  const agora = new Date();
  const [rec, env] = await Promise.all([
    col.find({ para: eu, rasgadoPara: { $ne: true } }).sort({ em: -1 }).limit(50).toArray(),
    col.find({ de: eu, rasgadoDe: { $ne: true } }).sort({ em: -1 }).limit(50).toArray(),
  ]);
  const ids = [...new Set([...rec.map((b) => b.de), ...env.map((b) => b.para)])].filter((id) => id !== "0112");
  const pacs = ids.length
    ? await (await colecaoPacientes()).find({ prontuario: { $in: ids } }, { projection: { _id: 0, prontuario: 1, nome: 1 } }).toArray()
    : [];
  const nome = (id: string) => (id === "0112" ? "" : (pacs.find((p) => p.prontuario === id)?.nome.split(" ")[0] ?? "—"));
  const hoje = diaBrasilia(agora);
  const vista = (b: Doc, outro: string): BilheteVisto => ({
    id: String(b._id),
    outro,
    nome: nome(outro),
    texto: b.texto,
    hora: horaBrasilia(b.em),
    hoje: diaBrasilia(b.em) === hoje,
    lido: !!b.lidoEm,
    fantasma: outro === "0112",
  });
  return {
    recebidos: rec.map((b) => vista(b, b.de)),
    enviados: env.map((b) => vista(b, b.para)),
  };
}

export async function marcarLidos(eu: string) {
  await (await colecao()).updateMany({ para: eu, lidoEm: { $exists: false } }, { $set: { lidoEm: new Date() } });
}

export async function enviarBilhete(eu: string, para: string, texto: string): Promise<string | null> {
  if (para === "0112") return "Remetente sem internação. Resposta indisponível.";
  const vinculo = await (await colecaoConvivio()).findOne({ _id: idVinculo(eu, para), estado: "aceito" });
  if (!vinculo) return "Só é possível escrever para pacientes do seu convívio.";
  if ((await enviadosHoje(eu)) >= BILHETES_POR_DIA)
    return `Você já enviou os ${BILHETES_POR_DIA} bilhetes de hoje. Novos bilhetes após a meia-noite.`;
  await (await colecao()).insertOne({ de: eu, para, texto, em: new Date() });
  return null;
}

/** Rasga o bilhete só para quem rasgou. O do 0112 volta com outro texto. */
export async function rasgarBilhete(eu: string, id: string): Promise<string | null> {
  if (!ObjectId.isValid(id)) return "Bilhete não encontrado.";
  const col = await colecao();
  const _id = new ObjectId(id);
  const b = await col.findOne({ _id, $or: [{ de: eu }, { para: eu }] });
  if (!b) return "Bilhete não encontrado.";
  if (b.de === "0112") {
    const n = Math.min((b.rasgos ?? 0) + 1, FALAS_0112.length - 1);
    await col.updateOne({ _id }, { $set: { rasgos: n, texto: FALAS_0112[n], em: new Date() }, $unset: { lidoEm: "" } });
    return null;
  }
  await col.updateOne({ _id }, { $set: b.de === eu ? { rasgadoDe: true } : { rasgadoPara: true } });
  return null;
}
