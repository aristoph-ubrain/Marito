import { banco, umaVez } from "./db";

/** eq = anotação da equipe: não é gravada aqui, vem das anotações da ficha (ver historico/page.tsx). */
export type TipoRegistro = "ev" | "os" | "ac" | "cv" | "eq";

export type Registro = {
  prontuario: string;
  em: Date;
  tipo: TipoRegistro;
  codigo: string;
  texto: string;
  xp?: number;
};

export type NovoRegistro = Omit<Registro, "prontuario">;

async function colecao() {
  const col = (await banco()).collection<Registro>("historico");
  await umaVez("idx:historico", () => col.createIndex({ prontuario: 1, em: -1 }));
  return col;
}

export async function registrar(prontuario: string, registros: NovoRegistro[]) {
  if (!registros.length) return;
  const col = await colecao();
  await col.insertMany(registros.map((r) => ({ ...r, prontuario })));
}

export async function listarHistorico(prontuario: string, limite = 200): Promise<Registro[]> {
  const col = await colecao();
  return col.find({ prontuario }, { projection: { _id: 0 } }).sort({ em: -1 }).limit(limite).toArray();
}
