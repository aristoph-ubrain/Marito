/**
 * Classes: classificação clínica dada pela coordenação. Só narrativa por enquanto
 * (não muda XP, atributos nem missões). O catálogo fica na coleção `classes`;
 * o paciente guarda o nome da classe em `classe`.
 */
import { banco, umaVez } from "./db";
import { NOME_PADRAO, type Classe } from "./classes-base";

export * from "./classes-base";

const INICIAIS: Classe[] = [
  { id: "anomalo", nome: NOME_PADRAO, descricao: "Classificação de entrada. Comportamento fora dos padrões, ainda sem perfil definido.", cor: "#8a3b2e", figurinha: 1, padrao: true, ordem: 1 },
  { id: "invocador", nome: "INVOCADOR", descricao: "Relata contato com presenças que respondem quando chamadas.", cor: "#5a3a6e", figurinha: 4, ordem: 2 },
  { id: "ocultista", nome: "OCULTISTA", descricao: "Coleciona símbolos e leituras proibidas. Escreve nas paredes durante o sono.", cor: "#2c4a8a", figurinha: 5, ordem: 3 },
  { id: "possuido", nome: "POSSUÍDO", descricao: "Episódios em que outra voz assume. Não reconhece o próprio nome nesses períodos.", cor: "#2b2620", figurinha: 6, ordem: 4 },
];

export async function colecaoClasses() {
  const col = (await banco()).collection<Classe>("classes");
  await umaVez("classes:iniciais", async () => {
    await col.createIndex({ id: 1 }, { unique: true });
    // Só cria o catálogo na primeira vez; depois, quem manda é o Mestre.
    if ((await col.countDocuments()) === 0) await col.insertMany(INICIAIS.map((c) => ({ ...c })));
  });
  return col;
}

export async function listarClasses(): Promise<Classe[]> {
  return (await colecaoClasses()).find({}, { projection: { _id: 0 } }).sort({ ordem: 1 }).toArray();
}

/** Classe pelo nome guardado no paciente (sem catálogo, devolve um carimbo neutro). */
export async function classePorNome(nome: string): Promise<Classe> {
  const c = await (await colecaoClasses()).findOne({ nome }, { projection: { _id: 0 } });
  return c ?? { id: "", nome, descricao: "", cor: "#8a3b2e", figurinha: 1, ordem: 0 };
}

export async function nomeClassePadrao(): Promise<string> {
  const c = await (await colecaoClasses()).findOne({ padrao: true }, { projection: { nome: 1 } });
  return c?.nome ?? NOME_PADRAO;
}

