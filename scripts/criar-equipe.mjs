// Cria ou atualiza uma conta da coordenação (Mestre).
// Uso: npm run db:equipe
// As contas da equipe NÃO podem ser criadas pelo cadastro do jogo.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const rl = createInterface({ input: stdin, output: stdout });
const usuario = (await rl.question("Usuário (ex.: dr.silva): ")).trim().toLowerCase();
const nome = (await rl.question("Nome exibido (ex.: Dr. Silva): ")).trim();
const senha = await rl.question("Senha (mín. 8 caracteres): ");
rl.close();

if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
  console.error("✘ Usuário inválido: use 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado.");
  process.exit(1);
}
if (!nome) {
  console.error("✘ Informe o nome exibido.");
  process.exit(1);
}
if (senha.length < 8 || senha.length > 72) {
  console.error("✘ A senha precisa ter de 8 a 72 caracteres.");
  process.exit(1);
}

const cliente = new MongoClient(process.env.MONGODB_URI);
try {
  const col = (await cliente.connect()).db("marito").collection("equipe");
  await col.createIndex({ usuario: 1 }, { unique: true });
  const senhaHash = await bcrypt.hash(senha, 10);
  await col.updateOne(
    { usuario },
    { $set: { nome, senhaHash, senhaAlteradaEm: new Date() }, $setOnInsert: { usuario, criadoEm: new Date() } },
    { upsert: true },
  );
  console.log(`✔ Conta da coordenação pronta: ${usuario} (${nome}).`);
} finally {
  await cliente.close();
}
