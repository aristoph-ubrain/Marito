// Copia as ordens de exemplo para o MongoDB. Uso: npm run db:semear
import { MongoClient } from "mongodb";

const s = (mmss) => { const [m, ss] = mmss.split(":").map(Number); return m * 60 + ss; };
const ordens = [
  { codigo: "OS-004", titulo: "Limpeza do Refeitório", ala: "TÉRREO", descricao: "", requisitos: [{ atributo: "FOR", minimo: 1 }], xp: 20, duracao: s("00:10"), situacao: "arq", vezes: 212, autor: "Enf. R. Matos" },
  { codigo: "OS-008", titulo: "Contar os Leitos", ala: "ALA A", descricao: "", requisitos: [{ atributo: "CON", minimo: 1 }], xp: 30, duracao: s("00:10"), situacao: "arq", vezes: 98, autor: "Enf. noturno" },
  { codigo: "OS-011", titulo: "Inventário da Farmácia", ala: "TÉRREO", descricao: "Conferir estoque de medicação controlada. Há mais frascos registrados do que pacientes.", requisitos: [{ atributo: "CON", minimo: 3 }], xp: 80, duracao: s("00:20"), situacao: "pub", vezes: 42, autor: "Dr. ██████" },
  { codigo: "OS-014", titulo: "Turno na Lavanderia", ala: "ALA B", descricao: "Separar roupas de cama. Uma das etiquetas tem o número do seu prontuário.", requisitos: [{ atributo: "FOR", minimo: 3 }], xp: 60, duracao: s("00:15"), situacao: "pub", vezes: 57, autor: "Enf. R. Matos" },
  { codigo: "OS-019", titulo: "Escutar o Quarto 112", ala: "ALA C", descricao: "Pacientes relatam batidas na parede. O quarto 112 está vazio desde 1998.", requisitos: [{ atributo: "VIN", minimo: 5 }, { atributo: "AFI", minimo: 3 }], xp: 220, duracao: s("00:40"), situacao: "pub", vezes: 9, autor: "— não identificado", protegida: true },
  { codigo: "OS-023", titulo: "Corredor das Portas Trancadas", ala: "ALA C", descricao: "Verificar as fechaduras durante a ronda. Uma delas abre por dentro.", requisitos: [{ atributo: "AGI", minimo: 4 }, { atributo: "SOR", minimo: 4 }], xp: 180, duracao: s("00:35"), situacao: "pub", vezes: 3, autor: "Dr. ██████" },
  { codigo: "OS-027", titulo: "Sessão com o Dr. ██████", ala: "CONSULTÓRIOS", descricao: "Entrevista sem prontuário anexado. O paciente deve manter contato visual.", requisitos: [{ atributo: "DOM", minimo: 3 }], xp: 260, duracao: s("00:45"), situacao: "pub", vezes: 1, autor: "Dr. ██████" },
  { codigo: "OS-031", titulo: "Ronda na Capela", ala: "CAPELA", descricao: "Verificar se as velas estão apagadas. Não responder se alguém chamar pelo nome.", requisitos: [{ atributo: "RIT", minimo: 3 }, { atributo: "AFI", minimo: 4 }], xp: 200, duracao: s("00:50"), situacao: "ras", vezes: 0, autor: "Dr. ██████" },
];

const cliente = new MongoClient(process.env.MONGODB_URI);
try {
  const db = (await cliente.connect()).db(process.env.MONGODB_DB || "marito");
  const col = db.collection("ordens");
  await col.createIndex({ codigo: 1 }, { unique: true });
  for (const o of ordens) {
    await col.updateOne({ codigo: o.codigo }, { $setOnInsert: { ...o, criadaEm: new Date() } }, { upsert: true });
  }
  // O próximo código gerado será OS-032.
  await db.collection("contadores").updateOne({ _id: "ordens" }, { $max: { valor: 31 } }, { upsert: true });
  console.log(`✔ ${ordens.length} ordens no banco.`);
} finally {
  await cliente.close();
}
