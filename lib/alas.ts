import { MongoBulkWriteError } from "mongodb";
import { banco, umaVez } from "./db";

/**
 * Áreas do hospital (no código e no banco continuam se chamando "alas").
 * Cada área tem nível mínimo e interdição próprios, missões e bônus de primeira visita.
 */
export type Ala = {
  id: string; // "R", "F", "E", "D", "I", "K", "S", "C", "P", "X"
  nome: string; // mesmo nome usado no campo `ala` das ordens
  sub: string;
  nivel: number;
  situacao: "liberada" | "interditada";
  ordem: number;
  secreta?: boolean;
  ocorrencias: string[];
};

const PADRAO: Ala[] = [
  { id: "R", nome: "RECEPÇÃO", sub: "Entrada · Triagem", nivel: 1, situacao: "liberada", ordem: 1, ocorrencias: ["O livro de visitas tem uma assinatura de 1998 com a tinta ainda úmida."] },
  { id: "F", nome: "FARMÁCIA", sub: "Medicação controlada", nivel: 1, situacao: "liberada", ordem: 2, ocorrencias: ["03:05 — Contagem de frascos não confere."] },
  { id: "E", nome: "REFEITÓRIO", sub: "Refeições · Cozinha", nivel: 1, situacao: "liberada", ordem: 3, ocorrencias: ["02:40 — Máquina do refeitório ligou sozinha."] },
  { id: "D", nome: "DORMITÓRIO", sub: "Leitos dos internos", nivel: 1, situacao: "liberada", ordem: 4, ocorrencias: ["Um paciente acordado às 03:17. Ninguém sabe dizer qual."] },
  { id: "I", nome: "INTERNAÇÃO", sub: "Observação · Isolamento", nivel: 1, situacao: "liberada", ordem: 5, ocorrencias: ["Câmera 4 sem sinal por 11 minutos."] },
  { id: "K", nome: "CONSULTÓRIO", sub: "Atendimento · Salas 1 a 4", nivel: 2, situacao: "liberada", ordem: 6, ocorrencias: ["Consultório 4 agendado para paciente sem prontuário."] },
  { id: "S", nome: "SUBSOLO", sub: "Lavanderia · Caldeira", nivel: 2, situacao: "liberada", ordem: 7, ocorrencias: ["Elevador de serviço parou no -2. O prédio não tem -2."] },
  { id: "C", nome: "ALA C", sub: "Interditada desde 1998", nivel: 3, situacao: "liberada", ordem: 8, ocorrencias: ["Luz acesa no 2º andar.", "Acesso liberado pelo sistema. Nenhum funcionário assinou."] },
  { id: "P", nome: "CAPELA", sub: "Desativada · Uso proibido", nivel: 5, situacao: "interditada", ordem: 9, ocorrencias: ["Velas encontradas acesas na segunda-feira."] },
  { id: "X", nome: "ALA ZERO", sub: "Sem registro na planta oficial", nivel: 8, situacao: "liberada", ordem: 10, secreta: true, ocorrencias: ["Registro inexistente."] },
];

/** Área onde fica o leito de todo paciente novo. */
export const AREA_INICIAL = "DORMITÓRIO";

export const NOMES_ALAS = PADRAO.filter((a) => !a.secreta).map((a) => a.nome);
/** Nível padrão de cada área (usado como nível de ordens antigas que não têm o campo). */
export const NIVEL_PADRAO_ALA: Record<string, number> = Object.fromEntries(PADRAO.map((a) => [a.nome, a.nivel]));

/** Alas antigas (antes das áreas) → área nova. */
const ANTIGAS: Record<string, string> = { "TÉRREO": "RECEPÇÃO", "ALA A": "DORMITÓRIO", "ALA B": "SUBSOLO", "CONSULTÓRIOS": "CONSULTÓRIO" };

/** Área de uma ordem antiga, pelo título e descrição; senão, a área equivalente à ala antiga. */
function areaDaOrdem(ala: string, texto: string): string {
  if (!(ala in ANTIGAS)) return ala;
  const t = texto.toLowerCase();
  if (/farm[aá]c|medica/.test(t)) return "FARMÁCIA";
  if (/refeit|cozinha|refei[cç]/.test(t)) return "REFEITÓRIO";
  if (/lavander|roupa|caldeira/.test(t)) return "SUBSOLO";
  if (/interna[cç]|isolamento|observa/.test(t)) return "INTERNAÇÃO";
  if (/leito|dormit/.test(t)) return "DORMITÓRIO";
  if (/recep|triagem|visita/.test(t)) return "RECEPÇÃO";
  return ANTIGAS[ala];
}

/**
 * Migração única das alas antigas para as áreas: ajusta as alas no banco,
 * move as ordens para a área certa e renomeia leito, localização e visitas dos pacientes.
 */
async function migrarParaAreas() {
  const db = await banco();
  const marca = db.collection<{ _id: string; feito: Date }>("contadores");
  if (await marca.findOne({ _id: "migracao-areas" })) return;

  const alas = db.collection<Ala>("alas");
  await alas.deleteMany({ id: { $nin: PADRAO.map((a) => a.id) } });
  // Nome, descrição e ordem vêm do padrão; nível e interdição de quem já existia são mantidos.
  await alas.bulkWrite(
    PADRAO.map(({ nivel, situacao, ...fixo }) => ({
      updateOne: { filter: { id: fixo.id }, update: { $set: fixo, $setOnInsert: { nivel, situacao } }, upsert: true },
    })),
    { ordered: false },
  );

  const ordens = db.collection<{ codigo: string; ala: string; titulo: string; descricao: string }>("ordens");
  for (const o of await ordens.find({ ala: { $in: Object.keys(ANTIGAS) } }).toArray()) {
    await ordens.updateOne({ codigo: o.codigo }, { $set: { ala: areaDaOrdem(o.ala, `${o.titulo} ${o.descricao}`) } });
  }

  const pacientes = db.collection("pacientes");
  for (const [velha, nova] of Object.entries(ANTIGAS)) {
    await pacientes.updateMany({ ala: velha }, { $set: { ala: nova } });
    await pacientes.updateMany({ local: velha }, { $set: { local: nova } });
    await pacientes.updateMany({ alasVisitadas: velha }, { $set: { "alasVisitadas.$[e]": nova } }, { arrayFilters: [{ e: velha }] });
  }
  await marca.updateOne({ _id: "migracao-areas" }, { $set: { feito: new Date() } }, { upsert: true });
}

async function colecao() {
  const col = (await banco()).collection<Ala>("alas");
  await umaVez("idx:alas", () => col.createIndex({ id: 1 }, { unique: true }));
  await umaVez("migracao:areas", migrarParaAreas);
  // Garante as áreas padrão (inclusive depois de um reset com o servidor ligado). A contagem é barata.
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
