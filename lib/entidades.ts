/** Entidades com as edições do Mestre (coleção `entidades`, só nome e descrição alterados). */
import { banco, umaVez } from "./db";
import { ENTIDADES_ORIGINAIS, type Entidade } from "./entidades-base";

export * from "./entidades-base";

type Edicao = { id: string; nome: string; descricao: string; editadaEm: Date; autor: string };

export async function colecaoEntidades() {
  const col = (await banco()).collection<Edicao>("entidades");
  await umaVez("idx:entidades", () => col.createIndex({ id: 1 }, { unique: true }));
  return col;
}

export async function listarEntidades(): Promise<(Entidade & { editada: boolean })[]> {
  const edicoes = await (await colecaoEntidades()).find({}, { projection: { _id: 0 } }).toArray();
  return ENTIDADES_ORIGINAIS.map((o) => {
    const e = edicoes.find((x) => x.id === o.id);
    return e ? { ...o, nome: e.nome, descricao: e.descricao, editada: true } : { ...o, editada: false };
  });
}
