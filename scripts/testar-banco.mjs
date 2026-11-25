// Testa a conexão com o MongoDB Atlas e mostra o que há no banco.
// Uso: npm run db:testar
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("✘ MONGODB_URI não encontrada. Confira o arquivo .env.local.");
  process.exit(1);
}

const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
  await cliente.connect();
  const db = cliente.db("marito");
  await db.command({ ping: 1 });
  console.log("✔ Conectado ao MongoDB Atlas (banco: marito).\n");
  for (const c of ["pacientes", "ordens", "alas", "equipe", "historico", "convivio", "mensagens", "tentativas"]) {
    console.log(`  ${c.padEnd(11)} ${await db.collection(c).countDocuments()}`);
  }
  const equipe = await db.collection("equipe").find({}, { projection: { _id: 0, usuario: 1, nome: 1 } }).toArray();
  console.log(equipe.length ? `\n  Contas da coordenação: ${equipe.map((m) => `${m.usuario} (${m.nome})`).join(", ")}` : "\n  Nenhuma conta da coordenação. Crie com: npm run db:equipe");
  const ordens = await db.collection("ordens").countDocuments();
  if (!ordens) console.log("  Nenhuma ordem de missão. Crie as de exemplo com: npm run db:semear");
} catch (erro) {
  console.error("✘ Falha na conexão:", erro.message);
  console.error("  Verifique usuário/senha no .env.local e se o seu IP está liberado no Atlas.");
  process.exitCode = 1;
} finally {
  await cliente.close();
}
