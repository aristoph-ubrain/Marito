import { MongoClient, type Db } from "mongodb";

// O cliente fica no globalThis: em desenvolvimento o Next recarrega os módulos a cada alteração,
// e na Vercel a mesma instância da função atende vários pedidos. Assim reaproveitamos a conexão.
const global = globalThis as unknown as { _mongo?: Promise<MongoClient>; _marito_init?: Map<string, Promise<unknown>> };

/** Nome do banco. Padrão "marito"; use outro (ex.: marito_dev) para separar desenvolvimento de produção. */
const NOME_BANCO = process.env.MONGODB_DB || "marito";

function cliente(): Promise<MongoClient> {
  if (!global._mongo) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI não definida (.env.local no seu computador, Environment Variables na Vercel)");
    global._mongo = new MongoClient(uri, { maxIdleTimeMS: 60_000 }).connect().catch((e) => {
      global._mongo = undefined; // permite tentar de novo no próximo pedido
      throw e;
    });
  }
  return global._mongo;
}

export async function banco(): Promise<Db> {
  return (await cliente()).db(NOME_BANCO);
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
