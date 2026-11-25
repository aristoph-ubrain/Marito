import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI não definida no .env.local");

// Em desenvolvimento o Next recarrega os módulos a cada alteração.
// Guardar o cliente no globalThis evita abrir uma conexão nova toda vez.
const global = globalThis as unknown as { _mongo?: Promise<MongoClient>; _marito_init?: Map<string, Promise<unknown>> };
const clientePromise = global._mongo ?? new MongoClient(uri).connect();
if (process.env.NODE_ENV !== "production") global._mongo = clientePromise;

export async function banco(): Promise<Db> {
  return (await clientePromise).db("marito");
}

/** Executa uma preparação (ex.: criar índice) uma única vez por processo. Se falhar, tenta de novo na próxima chamada. */
export function umaVez(chave: string, preparar: () => Promise<unknown>): Promise<unknown> {
  const mapa = (global._marito_init ??= new Map());
  let p = mapa.get(chave);
  if (!p) {
    p = preparar().catch((e) => {
      mapa.delete(chave);
      throw e;
    });
    mapa.set(chave, p);
  }
  return p;
}
