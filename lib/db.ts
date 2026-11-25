import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI não definida no .env.local");

// Em desenvolvimento o Next recarrega os módulos a cada alteração.
// Guardar o cliente no globalThis evita abrir uma conexão nova toda vez.
const global = globalThis as unknown as { _mongo?: Promise<MongoClient> };
const clientePromise = global._mongo ?? new MongoClient(uri).connect();
if (process.env.NODE_ENV !== "production") global._mongo = clientePromise;

export async function banco(): Promise<Db> {
  return (await clientePromise).db("marito");
}
