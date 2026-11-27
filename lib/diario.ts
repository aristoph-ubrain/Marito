/**
 * Diário: textos editados pelo Mestre (coleção `diario`, só as páginas alteradas)
 * e as páginas achadas por cada paciente (campo `paginas` do paciente).
 */
import { banco, umaVez } from "./db";
import { PAGINAS_ORIGINAIS, TOTAL_PAGINAS, type Pagina } from "./diario-base";

export * from "./diario-base";

type Edicao = Pagina & { editadaEm: Date; autor: string };

export async function colecaoDiario() {
  const col = (await banco()).collection<Edicao>("diario");
  await umaVez("idx:diario", () => col.createIndex({ n: 1 }, { unique: true }));
  return col;
}

/** As 13 páginas com as edições do Mestre aplicadas. */
export async function listarPaginas(): Promise<(Pagina & { editada: boolean })[]> {
  const edicoes = await (await colecaoDiario()).find({}, { projection: { _id: 0 } }).toArray();
  return PAGINAS_ORIGINAIS.map((o) => {
    const e = edicoes.find((x) => x.n === o.n);
    return e ? { n: o.n, data: e.data, area: e.area, texto: e.texto, outra: e.outra, editada: true } : { ...o, editada: false };
  });
}

/** Páginas 1–12 por área, para o sorteio ao concluir missões. */
export async function paginasPorArea(): Promise<Record<string, number[]>> {
  const mapa: Record<string, number[]> = {};
  for (const p of (await listarPaginas()).filter((x) => x.n <= TOTAL_PAGINAS)) (mapa[p.area] ??= []).push(p.n);
  return mapa;
}
