/**
 * Habilidades: o efeito de cada atributo no jogo. Funções puras (servidor e navegador).
 * Cada ponto fortalece o efeito; a cada 5 pontos o atributo abre um marco.
 */
import { ATRIBUTOS, CHAVES, nomeDe, type ChaveAtributo } from "./atributos";

export type Valores = Record<ChaveAtributo, number>;

export const PASSO_MARCO = 5;
export const TAMANHO_FILA = 3;
const TETO_BASE_MIN = 8 * 60;
const MIN_POR_5_VIT = 30;
const REDUCAO_MAX = 40;

const pct = (n: number) => `${(Math.round(n * 10) / 10).toString().replace(".", ",")}%`;
const horas = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
};

/** AGI: −1% na duração por ponto, até −40%. */
export const reducaoDuracao = (a: Valores) => Math.min(Math.max(0, a.AGI), REDUCAO_MAX) / 100;
/** CON: +0,5% de XP por ponto; FOR: +1% por ponto em missões de 1 h ou mais. */
export const bonusXp = (a: Valores, duracaoBase: number) => (a.CON * 0.5 + (duracaoBase >= 3600 ? a.FOR : 0)) / 100;
/** VIT: teto offline das automações (base 8 h, +30 min a cada 5 pontos). */
export const tetoOfflineMin = (a: Valores) => TETO_BASE_MIN + Math.floor(a.VIT / PASSO_MARCO) * MIN_POR_5_VIT;
/** SOR: 0,5% de chance por ponto de a missão contar duas vezes. */
export const chanceDobro = (a: Valores) => Math.min(1, Math.max(0, a.SOR) * 0.005);

/** Nenhuma missão fica mais curta que isto, seja qual for a AGI. */
export const DURACAO_MINIMA_S = 5;
export const duracaoComHabilidade = (duracao: number, a: Valores) => Math.max(DURACAO_MINIMA_S, Math.round(duracao * (1 - reducaoDuracao(a))));
export const xpComHabilidade = (xp: number, duracaoBase: number, a: Valores) => Math.round(xp * (1 + bonusXp(a, duracaoBase)));

/* ---------- Automações (marcos) ---------- */

export type Automacao = "repetir" | "fila" | "pontos";
export const AUTOMACOES: Record<Automacao, { chave: ChaveAtributo; marco: number; texto: string }> = {
  repetir: { chave: "AGI", marco: 10, texto: "Repetir missão: ao terminar, a mesma ordem recomeça sozinha" },
  fila: { chave: "VIT", marco: 10, texto: `Fila de ordens: até ${TAMANHO_FILA} missões em sequência` },
  pontos: { chave: "CON", marco: 10, texto: "Distribuição automática dos pontos de nível, por um plano" },
};
export const ehAutomacao = (k: unknown): k is Automacao => typeof k === "string" && k in AUTOMACOES;
export const automacaoLiberada = (k: Automacao, a: Valores) => a[AUTOMACOES[k].chave] >= AUTOMACOES[k].marco;

export type Plano = { tipo: "igual" } | { tipo: "um"; chave: ChaveAtributo } | { tipo: "ultima" };
export type Automacoes = { repetir?: boolean; fila?: boolean; pontos?: boolean; plano?: Plano };

export const PLANOS: { tipo: Plano["tipo"]; rotulo: string }[] = [
  { tipo: "igual", rotulo: "Igual em todos" },
  { tipo: "um", rotulo: "Tudo num atributo" },
  { tipo: "ultima", rotulo: "Repetir minha última distribuição" },
];

/** Divide `pontos` conforme o plano. Devolve só os acréscimos. */
export function distribuirPorPlano(pontos: number, atual: Valores, plano: Plano | undefined, ultima: Partial<Valores>): Partial<Valores> {
  const add: Partial<Valores> = {};
  if (pontos <= 0) return add;
  const p = plano ?? { tipo: "igual" };
  if (p.tipo === "um") {
    add[p.chave] = pontos;
    return add;
  }
  const sequencia = p.tipo === "ultima" ? CHAVES.flatMap((c) => Array<ChaveAtributo>(Math.max(0, ultima[c] ?? 0)).fill(c)) : [];
  if (sequencia.length) {
    for (let i = 0; i < pontos; i++) {
      const c = sequencia[i % sequencia.length];
      add[c] = (add[c] ?? 0) + 1;
    }
    return add;
  }
  // "Igual em todos": cada ponto vai para o atributo mais baixo (empate: ordem da ficha).
  const v = { ...atual };
  for (let i = 0; i < pontos; i++) {
    const c = CHAVES.reduce((m, k) => (v[k] < v[m] ? k : m), CHAVES[0]);
    v[c] += 1;
    add[c] = (add[c] ?? 0) + 1;
  }
  return add;
}

export const resumoDistribuicao = (add: Partial<Valores>) =>
  CHAVES.filter((c) => add[c]).map((c) => `+${add[c]} ${nomeDe(c)}`).join(", ");

/* ---------- Vínculo: segredos ---------- */

export const revela0112 = (a: Valores) => a.VIN >= 5;
export const revelaAlaZero = (a: Valores) => a.VIN >= 10;
export const revelaTarjas = (a: Valores) => a.VIN >= 15;

/* ---------- Textos da tela de atributos ---------- */

export type Marco = { n: number; texto: string; auto?: Automacao };
export const HABILIDADES: Record<ChaveAtributo, { nome: string; regra: string; agora: (v: number) => string; marcos: Marco[] }> = {
  FOR: { nome: "Turno pesado", regra: "+1% de XP em missões de 1 h ou mais, por ponto.", agora: (v) => `+${v}%`, marcos: [] },
  AGI: {
    nome: "Passos leves",
    regra: `−1% na duração das missões, por ponto (até −${REDUCAO_MAX}%).`,
    agora: (v) => `−${Math.min(v, REDUCAO_MAX)}%`,
    marcos: [{ n: 10, texto: AUTOMACOES.repetir.texto, auto: "repetir" }],
  },
  VIT: {
    nome: "Resistência",
    regra: "+30 min de teto offline a cada 5 pontos (base 8 h). As automações param depois desse tempo sem você entrar.",
    agora: (v) => horas(TETO_BASE_MIN + Math.floor(v / PASSO_MARCO) * MIN_POR_5_VIT),
    marcos: [{ n: 10, texto: AUTOMACOES.fila.texto, auto: "fila" }],
  },
  CON: {
    nome: "Prontuário em dia",
    regra: "+0,5% de XP em todas as missões, por ponto.",
    agora: (v) => `+${pct(v * 0.5)}`,
    marcos: [{ n: 10, texto: AUTOMACOES.pontos.texto, auto: "pontos" }],
  },
  VIN: {
    nome: "Escuta",
    regra: "Abre segredos do hospital nos marcos.",
    agora: (v) => `${v >= 15 ? 3 : v >= 10 ? 2 : v >= 5 ? 1 : 0} segredo(s)`,
    marcos: [
      { n: 5, texto: "As falas do ████████ no chat aparecem sem tarja" },
      { n: 10, texto: "A ala sem registro aparece na planta antes do nível 8" },
      { n: 15, texto: "Lê o que está escrito sob as tarjas da ficha" },
    ],
  },
  SOR: { nome: "Acaso", regra: "0,5% de chance por ponto de a missão contar duas vezes.", agora: (v) => pct(v * 0.5), marcos: [] },
};

/** Efeito somado, para o resumo da tela. */
export function resumoHabilidades(a: Valores) {
  return {
    duracao: `−${Math.round(reducaoDuracao(a) * 100)}%`,
    xp: `+${pct(a.CON * 0.5)} (+${a.FOR}% longas)`,
    teto: horas(tetoOfflineMin(a)),
    dobro: pct(chanceDobro(a) * 100),
  };
}

export const ORDEM_ATRIBUTOS = ATRIBUTOS.map((a) => a.chave);
