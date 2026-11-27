import { AREA_INICIAL } from "./alas";
import bcrypt from "bcryptjs";
import { MongoServerError } from "mongodb";
import { ATRIBUTO_INICIAL, ATRIBUTOS_REMOVIDOS, atributosIniciais, atributosZerados, CHAVES, type ChaveAtributo } from "./atributos";
import { banco, umaVez } from "./db";
import { nomeClassePadrao } from "./classes";
import type { Automacoes } from "./habilidades";
import { registrar } from "./historico";
import { PONTOS_POR_NIVEL } from "./regras";

const HASH_FALSO = bcrypt.hashSync("prontuario-inexistente", 10);

export type Anotacao = { em: Date; autor: string; texto: string };
export type EmCurso = { codigo: string; titulo: string; inicio: Date; duracao: number; xp: number; ala?: string };
export type PaginaAchada = { n: number; em: Date; area: string };
/** Ordem na fila: duração e XP já com as habilidades aplicadas. */
export type NaFila = Omit<EmCurso, "inicio">;

export type Paciente = {
  prontuario: string; // "0347"
  nome: string;
  idade: number;
  sexo: "M" | "F" | "O";
  altura: string;
  nacionalidade: string;
  profissao: string;
  relato: string;
  senhaHash: string;
  classe: string;
  nivel: number;
  xp: number; // XP dentro do nível atual
  pontos: number; // pontos de atributo ainda não distribuídos
  ala: string; // leito (fixo)
  quarto: string;
  local?: string; // ala onde o paciente está agora
  criadoEm: Date;
  // Campos de jogo (opcionais para aceitar documentos criados antes deles).
  atributos?: Record<ChaveAtributo, number>;
  xpTotal?: number;
  versao?: number; // controle de concorrência otimista
  missoesHoje?: { dia: string; n: number };
  bonusDia?: string; // último dia (Brasília) em que recebeu o bônus de acesso
  alasVisitadas?: string[];
  emCurso?: EmCurso | null;
  concluidas?: Record<string, number>;
  diagnostico?: string;
  anotacoes?: Anotacao[];
  foto?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; // figurinha escolhida na ficha
  recusou0112?: string; // dia em que recusou o pedido do 0112
  aceitou0112?: boolean;
  avisosVistosEm?: Date; // último "CIENTE" nos avisos
  automacoes?: Automacoes; // interruptores das habilidades (marcos)
  fila?: NaFila[]; // próximas ordens (VIT 10)
  ultimaDistribuicao?: Partial<Record<ChaveAtributo, number>>; // para o plano "repetir minha última"
  vistoEm?: Date; // último acesso: as automações param no teto offline depois dele
  classeAnterior?: string; // carimbo riscado na ficha
  classeEm?: Date; // última reclassificação
  classeMotivo?: string;
  paginas?: PaginaAchada[]; // páginas do diário encontradas
  paginaNova?: number | null; // achada e ainda não lida (aviso no diário)
};

/** Paciente com todos os campos de jogo preenchidos. */
type Opcionais = "recusou0112" | "aceitou0112" | "foto" | "avisosVistosEm" | "classeAnterior" | "classeEm" | "classeMotivo" | "paginaNova";
export type PacienteJogo = Required<Omit<Paciente, Opcionais | "emCurso">> & Pick<Paciente, Opcionais> & { emCurso: EmCurso | null };

export function normalizar(p: Paciente): PacienteJogo {
  return {
    ...p,
    // Só os atributos atuais (ignora chaves antigas que ainda estejam no banco).
    atributos: Object.fromEntries(CHAVES.map((c) => [c, p.atributos?.[c] ?? atributosZerados()[c]])) as Record<ChaveAtributo, number>,
    xpTotal: p.xpTotal ?? p.xp,
    versao: p.versao ?? 0,
    missoesHoje: p.missoesHoje ?? { dia: "", n: 0 },
    bonusDia: p.bonusDia ?? "",
    alasVisitadas: p.alasVisitadas ?? [AREA_INICIAL],
    local: p.local ?? p.ala,
    emCurso: p.emCurso ?? null,
    concluidas: p.concluidas ?? {},
    diagnostico: p.diagnostico ?? "Em avaliação",
    anotacoes: p.anotacoes ?? [],
    automacoes: p.automacoes ?? {},
    fila: p.fila ?? [],
    ultimaDistribuicao: p.ultimaDistribuicao ?? {},
    vistoEm: p.vistoEm ?? p.criadoEm,
    paginas: p.paginas ?? [],
  };
}

export type NovoPaciente = Pick<Paciente, "nome" | "idade" | "sexo" | "altura" | "nacionalidade" | "profissao" | "relato">;

export async function colecaoPacientes() {
  const col = (await banco()).collection<Paciente>("pacientes");
  await umaVez("idx:pacientes", () => col.createIndex({ prontuario: 1 }, { unique: true }));
  await umaVez("migracao:atributos-6", () => migrarAtributos());
  return col;
}

/**
 * Migração única para os 6 atributos: os pontos acima do inicial em AFI, COM, RIT, DOM e SIM
 * voltam como pontos para distribuir; VIT começa no valor inicial. Marca feita em `contadores`.
 */
async function migrarAtributos() {
  const db = await banco();
  const marca = db.collection<{ _id: string; feito: Date }>("contadores");
  if (await marca.findOne({ _id: "migracao-atributos-6" })) return;
  // Documento sem tipo fixo: a migração lida com campos que não existem mais no tipo Paciente.
  const col = db.collection<{ prontuario: string; atributos?: Record<string, number>; pontos?: number; versao?: number }>("pacientes");
  const filtro = { $or: ATRIBUTOS_REMOVIDOS.map((k) => ({ [`atributos.${k}`]: { $exists: true } })) };
  for (const p of await col.find(filtro, { projection: { prontuario: 1, atributos: 1 } }).toArray()) {
    const devolver = ATRIBUTOS_REMOVIDOS.reduce((s, k) => s + Math.max(0, (p.atributos?.[k] ?? 0) - ATRIBUTO_INICIAL), 0);
    const unset = Object.fromEntries(ATRIBUTOS_REMOVIDOS.map((k) => [`atributos.${k}`, ""] as const)) as Record<string, "">;
    await col.updateOne(
      { prontuario: p.prontuario },
      { $inc: { pontos: devolver, versao: 1 }, $unset: unset, ...(p.atributos?.VIT === undefined ? { $set: { "atributos.VIT": ATRIBUTO_INICIAL } } : {}) },
    );
  }
  await marca.updateOne({ _id: "migracao-atributos-6" }, { $set: { feito: new Date() } }, { upsert: true });
}

/** Prontuário aleatório de 0120 a 9999 (9.880 números). O 0112 é reservado. */
function sortearProntuario() {
  let n: string;
  do n = String(120 + Math.floor(Math.random() * 9880)).padStart(4, "0");
  while (n === "0112");
  return n;
}

/** Cria o paciente com senha criptografada e um prontuário único. */
export async function criarPaciente(dados: NovoPaciente, senha: string): Promise<Paciente> {
  const col = await colecaoPacientes();
  const senhaHash = await bcrypt.hash(senha, 10);
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const prontuario = sortearProntuario();
    const agora = new Date();
    const paciente: Paciente = {
      ...dados,
      prontuario,
      senhaHash,
      classe: await nomeClassePadrao(),
      nivel: 1,
      xp: 0,
      // Pontos iniciais: o nível 1 concede os mesmos 3 pontos de cada nível.
      pontos: PONTOS_POR_NIVEL,
      ala: AREA_INICIAL,
      quarto: prontuario.slice(1),
      criadoEm: agora,
      atributos: atributosIniciais(), // todos começam com 1
      xpTotal: 0,
      versao: 0,
      missoesHoje: { dia: "", n: 0 },
      bonusDia: "",
      alasVisitadas: [AREA_INICIAL],
      local: AREA_INICIAL,
      emCurso: null,
      concluidas: {},
      diagnostico: "Em avaliação",
      anotacoes: [{ em: agora, autor: "Triagem", texto: "Internação registrada. Paciente aguarda avaliação da equipe." }],
    };
    try {
      await col.insertOne({ ...paciente });
      await registrar(prontuario, [
        { em: agora, tipo: "ac", codigo: "AC-D", texto: `Internação registrada. Dormitório, leito ${paciente.quarto}.` },
        { em: new Date(agora.getTime() + 1000), tipo: "ev", codigo: "EV-01", texto: `Classificação inicial registrada: ${paciente.classe}.` },
      ]);
      return paciente;
    } catch (e) {
      // Prontuário já usado: sorteia outro.
      if (e instanceof MongoServerError && e.code === 11000) continue;
      throw e;
    }
  }
  throw new Error("Não há prontuário livre. Procure a enfermaria.");
}

/** Confere prontuário e senha. Devolve o paciente ou null. */
export async function autenticarPaciente(prontuario: string, senha: string): Promise<Paciente | null> {
  const col = await colecaoPacientes();
  const paciente = await col.findOne({ prontuario }, { projection: { _id: 0 } });
  if (!paciente) {
    // Compara mesmo assim: o tempo de resposta não revela se o prontuário existe.
    await bcrypt.compare(senha, HASH_FALSO);
    return null;
  }
  return (await bcrypt.compare(senha, paciente.senhaHash)) ? paciente : null;
}

/** Lê um paciente (sem a senha). */
export async function buscarPaciente(prontuario: string): Promise<PacienteJogo | null> {
  const col = await colecaoPacientes();
  const p = await col.findOne({ prontuario }, { projection: { _id: 0 } });
  return p ? normalizar(p) : null;
}
