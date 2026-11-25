// Remove uma conta da coordenação (Mestre).
// Uso: npm run db:equipe:remover
// A sessão aberta dessa conta deixa de valer na hora (o sistema confere a conta a cada acesso).
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { MongoClient } from "mongodb";

const cliente = new MongoClient(process.env.MONGODB_URI);
const rl = createInterface({ input: stdin, output: stdout });
try {
  const col = (await cliente.connect()).db("marito").collection("equipe");
  const contas = await col.find({}, { projection: { _id: 0, usuario: 1, nome: 1 } }).sort({ usuario: 1 }).toArray();
  if (!contas.length) {
    console.log("Nenhuma conta da coordenação cadastrada.");
    process.exit(0);
  }
  console.log("\nContas da coordenação:");
  contas.forEach((c, i) => console.log(`  ${i + 1}. ${c.usuario} (${c.nome})`));

  const escolha = (await rl.question("\nNúmero ou usuário da conta a remover: ")).trim().toLowerCase();
  const conta = contas[Number(escolha) - 1] ?? contas.find((c) => c.usuario === escolha);
  if (!conta) {
    console.log("✘ Conta não encontrada. Nada foi apagado.");
    process.exit(1);
  }
  if (contas.length === 1) console.log("\nAtenção: é a única conta. Sem ela ninguém acessa o painel até rodar npm run db:equipe.");

  const confirma = (await rl.question(`Digite o usuário "${conta.usuario}" para confirmar a remoção: `)).trim().toLowerCase();
  if (confirma !== conta.usuario) {
    console.log("✘ Cancelado. Nada foi apagado.");
    process.exit(0);
  }
  await col.deleteOne({ usuario: conta.usuario });
  console.log(`✔ Conta ${conta.usuario} removida. A sessão dela foi encerrada.`);
} finally {
  rl.close();
  await cliente.close();
}
