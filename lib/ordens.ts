import { banco } from "./db";
import type { ChaveAtributo, Missao } from "./mock";

export type Situacao = "pub" | "ras" | "arq";

export type Ordem = {
  codigo: string; // "OS-031"
  titulo: string;
  ala: string; // "CAPELA"
  descricao: string;
  requisitos: { atributo: ChaveAtributo; minimo: number }[];
  xp: number;
  duracao: number; // em segundos
  situacao: Situacao;
  vezes: number; // quantas vezes foi concluída
  autor: string;
  protegida?: boolean;
  criadaEm: Date;
};

async function colecao() {
  return (await banco()).collection<Ordem>("ordens");
}

/** Todas as ordens, para a coordenação. */
export async function listarOrdens(): Promise<Ordem[]> {
  const c = await colecao();
  return c.find({}, { projection: { _id: 0 } }).sort({ codigo: 1 }).toArray();
}

/** Só as publicadas, já no formato que o quadro do paciente usa. */
export async function listarMissoesPublicadas(): Promise<Missao[]> {
  const c = await colecao();
  const ordens = await c.find({ situacao: "pub" }, { projection: { _id: 0 } }).sort({ codigo: 1 }).toArray();
  return ordens.map((o) => ({
    codigo: o.codigo,
    titulo: o.titulo,
    local: o.ala,
    descricao: o.descricao,
    requisitos: o.requisitos,
    xp: o.xp,
    duracao: o.duracao,
  }));
}

/** Gera o próximo código (OS-032, OS-033…) de forma segura, com um contador no banco. */
export async function proximoCodigo(): Promise<string> {
  const db = await banco();
  const contador = await db
    .collection<{ _id: string; valor: number }>("contadores")
    .findOneAndUpdate({ _id: "ordens" }, { $inc: { valor: 1 } }, { upsert: true, returnDocument: "after" });
  return `OS-${String(contador!.valor).padStart(3, "0")}`;
}
