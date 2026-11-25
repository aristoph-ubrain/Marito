import bcrypt from "bcryptjs";
import { MongoServerError } from "mongodb";
import { atributosIniciais, atributosZerados, type ChaveAtributo } from "./atributos";
import { banco, umaVez } from "./db";
import { registrar } from "./historico";
import { PONTOS_POR_NIVEL } from "./regras";

const HASH_FALSO = bcrypt.hashSync("prontuario-inexistente", 10);

export type Anotacao = { em: Date; autor: string; texto: string };
export type EmCurso = { codigo: string; titulo: string; inicio: Date; duracao: number; xp: number };

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
};

/** Paciente com todos os campos de jogo preenchidos. */
export type PacienteJogo = Required<Omit<Paciente, "recusou0112" | "aceitou0112" | "emCurso" | "foto">> &
  Pick<Paciente, "recusou0112" | "aceitou0112" | "foto"> & { emCurso: EmCurso | null };

export function normalizar(p: Paciente): PacienteJogo {
  return {
    ...p,
    atributos: { ...atributosZerados(), ...(p.atributos ?? {}) },
    xpTotal: p.xpTotal ?? p.xp,
    versao: p.versao ?? 0,
    missoesHoje: p.missoesHoje ?? { dia: "", n: 0 },
    bonusDia: p.bonusDia ?? "",
    alasVisitadas: p.alasVisitadas ?? ["ALA A"],
    local: p.local ?? p.ala,
    emCurso: p.emCurso ?? null,
    concluidas: p.concluidas ?? {},
    diagnostico: p.diagnostico ?? "Em avaliação",
    anotacoes: p.anotacoes ?? [],
  };
}

export type NovoPaciente = Pick<Paciente, "nome" | "idade" | "sexo" | "altura" | "nacionalidade" | "profissao" | "relato">;

export async function colecaoPacientes() {
  const col = (await banco()).collection<Paciente>("pacientes");
  await umaVez("idx:pacientes", () => col.createIndex({ prontuario: 1 }, { unique: true }));
  return col;
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
      classe: "ANÔMALO",
      nivel: 1,
      xp: 0,
      // Pontos iniciais: o nível 1 concede os mesmos 3 pontos de cada nível.
      pontos: PONTOS_POR_NIVEL,
      ala: "ALA A",
      quarto: prontuario.slice(1),
      criadoEm: agora,
      atributos: atributosIniciais(), // todos começam com 1
      xpTotal: 0,
      versao: 0,
      missoesHoje: { dia: "", n: 0 },
      bonusDia: "",
      alasVisitadas: ["ALA A"],
      local: "ALA A",
      emCurso: null,
      concluidas: {},
      diagnostico: "Em avaliação",
      anotacoes: [{ em: agora, autor: "Triagem", texto: "Internação registrada. Paciente aguarda avaliação da equipe." }],
    };
    try {
      await col.insertOne({ ...paciente });
      await registrar(prontuario, [
        { em: agora, tipo: "ac", codigo: "AC-A", texto: `Internação registrada. Ala A, quarto ${paciente.quarto}.` },
        { em: new Date(agora.getTime() + 1000), tipo: "ev", codigo: "EV-01", texto: "Classificação inicial registrada: ANÔMALO." },
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
