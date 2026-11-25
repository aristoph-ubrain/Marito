// Testa a conexão com o MongoDB Atlas usando o MONGODB_URI do .env.local.
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
  await cliente.db("marito").command({ ping: 1 });
  console.log("✔ Conectado ao MongoDB Atlas (banco: marito).");
} catch (erro) {
  console.error("✘ Falha na conexão:", erro.message);
  console.error("  Verifique usuário/senha no .env.local e se o seu IP está liberado no Atlas.");
  process.exitCode = 1;
} finally {
  await cliente.close();
}
