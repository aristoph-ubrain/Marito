// Apaga os dados de jogo do MongoDB para recomeçar do zero.
// Uso:
//   npm run db:resetar          → apaga personagens, histórico, convívio e tentativas;
//                                  volta as alas ao padrão e zera a contagem das ordens.
//   npm run db:resetar:tudo      → também apaga ordens, contadores e contas da coordenação.
// ATENÇÃO: não há como desfazer.
import { createInterface } from "node:readline/promises";
import { stdin, stdout, argv } from "node:process";
import { MongoClient } from "mongodb";

// No PowerShell o "--" some e o npm recebe --tudo como configuração própria (npm_config_tudo).
const tudo = argv.includes("--tudo") || process.env.npm_config_tudo === "true" || process.env.MARITO_RESET_TUDO === "1";
const apagar = ["pacientes", "historico", "convivio", "tentativas", "alas", "mensagens", "bilhetes"];
if (tudo) apagar.push("ordens", "contadores", "equipe");

const cliente = new MongoClient(process.env.MONGODB_URI);
try {
  const db = (await cliente.connect()).db(process.env.MONGODB_DB || "marito");
  console.log("\nBanco: marito");
  for (const c of apagar) {
    const n = await db.collection(c).countDocuments();
    console.log(`  - ${c.padEnd(11)} ${n} documento(s) serão APAGADOS`);
  }
  if (!tudo) console.log("  - ordens      mantidas (contagem de conclusões volta a 0)\n  - equipe      mantida (contas da coordenação continuam valendo)");
  console.log("\nIsto não pode ser desfeito.");

  const rl = createInterface({ input: stdin, output: stdout });
  const resposta = (await rl.question('Digite RESETAR para confirmar: ')).trim();
  rl.close();
  if (resposta !== "RESETAR") {
    console.log("✘ Cancelado. Nada foi apagado.");
    process.exit(0);
  }

  for (const c of apagar) await db.collection(c).drop().catch(() => undefined);
  if (!tudo) await db.collection("ordens").updateMany({}, { $set: { vezes: 0 } });
  console.log("✔ Banco resetado. As alas padrão serão recriadas no próximo acesso ao jogo.");
  console.log("  Se o npm run dev estiver rodando, pare (Ctrl+C) e inicie de novo para recriar os índices.");
  if (tudo) console.log("  Rode npm run db:semear (ordens de exemplo) e npm run db:equipe (conta do Mestre).");
} finally {
  await cliente.close();
}
