import { MongoBulkWriteError } from "mongodb";
import { banco, umaVez } from "./db";

export type Ala = {
  id: string; // "T", "A", "B", "K", "C", "P", "X"
  nome: string; // mesmo nome usado no campo `ala` das ordens
  sub: string;
  nivel: number;
  situacao: "liberada" | "interditada";
  ordem: number;
  secreta?: boolean;
  ocorrencias: string[];
};

const PADRAO: Ala[] = [
  { id: "T", nome: "TÉRREO", sub: "Recepção · Farmácia · Refeitório", nivel: 1, situacao: "liberada", ordem: 1, ocorrencias: ["02:40 — Máquina do refeitório ligou sozinha.", "03:05 — Farmácia: contagem de frascos não confere."] },
  { id: "A", nome: "ALA A", sub: "Dormitórios · Internação", nivel: 1, situacao: "liberada", ordem: 2, ocorrencias: ["Câmera 4 sem sinal por 11 minutos.", "Um paciente acordado às 03:17. Ninguém sabe dizer qual."] },
  { id: "B", nome: "ALA B", sub: "Lavanderia · Subsolo", nivel: 2, situacao: "liberada", ordem: 3, ocorrencias: ["Elevador de serviço parou no -2. O prédio não tem -2."] },
  { id: "K", nome: "CONSULTÓRIOS", sub: "Atendimento · Salas 1 a 4", nivel: 2, situacao: "liberada", ordem: 4, ocorrencias: ["Consultório 4 agendado para paciente sem prontuário."] },
  { id: "C", nome: "ALA C", sub: "Interditada desde 1998", nivel: 3, situacao: "liberada", ordem: 5, ocorrencias: ["Luz acesa no 2º andar.", "Acesso liberado pelo sistema. Nenhum funcionário assinou."] },
  { id: "P", nome: "CAPELA", sub: "Desativada · Uso proibido", nivel: 5, situacao: "interditada", ordem: 6, ocorrencias: ["Velas encontradas acesas na segunda-feira."] },
  { id: "X", nome: "ALA ZERO", sub: "Sem registro na planta oficial", nivel: 8, situacao: "liberada", ordem: 7, secreta: true, ocorrencias: ["Registro inexistente."] },
];

export const NOMES_ALAS = PADRAO.filter((a) => !a.secreta).map((a) => a.nome);

async function colecao() {
  const col = (await banco()).collection<Ala>("alas");
  await umaVez("idx:alas", () => col.createIndex({ id: 1 }, { unique: true }));
  // Garante as alas padrão (inclusive depois de um reset com o servidor ligado). A contagem é barata.
  if ((await col.estimatedDocumentCount()) < PADRAO.length) {
    try {
      await col.bulkWrite(
        PADRAO.map((a) => ({ updateOne: { filter: { id: a.id }, update: { $setOnInsert: a }, upsert: true } })),
        { ordered: false },
      );
    } catch (e) {
      // Outra requisição semeou ao mesmo tempo: chave duplicada é esperada.
      if (!(e instanceof MongoBulkWriteError && e.code === 11000)) throw e;
    }
  }
  return col;
}

export async function listarAlas(): Promise<Ala[]> {
  return (await colecao()).find({}, { projection: { _id: 0 } }).sort({ ordem: 1 }).toArray();
}

export const alaAcessivel = (a: Ala, nivel: number) => a.situacao === "liberada" && nivel >= a.nivel;

export async function salvarConfigAlas(config: { id: string; nivel: number; situacao: Ala["situacao"] }[]) {
  const col = await colecao();
  await col.bulkWrite(
    config.map((c) => ({
      updateOne: { filter: { id: c.id, secreta: { $ne: true } }, update: { $set: { nivel: c.nivel, situacao: c.situacao } } },
    })),
  );
}
