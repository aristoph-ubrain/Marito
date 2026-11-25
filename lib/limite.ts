/**
 * Limite de tentativas (login e cadastro), guardado no MongoDB com expiração automática.
 * Protege contra força bruta de senhas e contra quem tenta esgotar os prontuários.
 */
import { headers } from "next/headers";
import { banco, umaVez } from "./db";

type Contador = { _id: string; n: number; expira: Date };

async function colecao() {
  const col = (await banco()).collection<Contador>("tentativas");
  await umaVez("idx:tentativas", () => col.createIndex({ expira: 1 }, { expireAfterSeconds: 0 }));
  return col;
}

/** IP de quem fez a requisição (primeiro da lista do proxy). */
export async function ipAtual(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim().slice(0, 64);
}

/** Soma uma tentativa e diz se ainda está dentro do limite. */
export async function consumir(chave: string, maximo: number, janelaSegundos: number): Promise<boolean> {
  const col = await colecao();
  const agora = Date.now();
  const doc = await col.findOneAndUpdate(
    { _id: chave },
    { $inc: { n: 1 }, $setOnInsert: { expira: new Date(agora + janelaSegundos * 1000) } },
    { upsert: true, returnDocument: "after" },
  );
  // Se o índice TTL ainda não removeu um contador vencido, recomeça a contagem.
  if (doc && doc.expira.getTime() < agora) {
    await col.updateOne({ _id: chave }, { $set: { n: 1, expira: new Date(agora + janelaSegundos * 1000) } });
    return true;
  }
  return (doc?.n ?? 1) <= maximo;
}

export async function zerar(chave: string) {
  await (await colecao()).deleteOne({ _id: chave });
}
