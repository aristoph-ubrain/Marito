export type ChaveAtributo = "FOR" | "AGI" | "VIT" | "CON" | "VIN" | "SOR";

/** Os 6 atributos do paciente (desde 25/11/2026; antes eram 10). */
export const ATRIBUTOS: { chave: ChaveAtributo; sigla: string; nome: string; descricao: string }[] = [
  { chave: "FOR", sigla: "FOR", nome: "Força", descricao: "Potência muscular, dano físico e capacidade de carregar peso." },
  { chave: "AGI", sigla: "AGI", nome: "Agilidade", descricao: "Velocidade, reflexos, esquiva e movimentos rápidos." },
  { chave: "VIT", sigla: "VIT", nome: "Vitalidade", descricao: "Resistência física e mental: saúde e capacidade de aguentar o que o hospital faz com o paciente." },
  { chave: "CON", sigla: "CON", nome: "Conhecimento", descricao: "Domínio de ciências, ocultismo, história e conhecimentos específicos." },
  { chave: "VIN", sigla: "VIN", nome: "Vínculo", descricao: "Conexão e comunicação com entidades e espíritos." },
  { chave: "SOR", sigla: "SOR", nome: "Sorte", descricao: "Influência sobre acontecimentos imprevisíveis." },
];

/** Atributos que existiam antes e foram removidos (os pontos voltam para distribuir). */
export const ATRIBUTOS_REMOVIDOS = ["AFI", "COM", "RIT", "DOM", "SIM"] as const;

export const CHAVES = ATRIBUTOS.map((a) => a.chave);
export const ehChave = (c: unknown): c is ChaveAtributo => typeof c === "string" && (CHAVES as string[]).includes(c);
export const siglaDe = (c: ChaveAtributo) => ATRIBUTOS.find((a) => a.chave === c)?.sigla ?? c;
export const nomeDe = (c: ChaveAtributo) => ATRIBUTOS.find((a) => a.chave === c)?.nome ?? c;
export const atributosZerados = () => Object.fromEntries(CHAVES.map((c) => [c, 0])) as Record<ChaveAtributo, number>;
/** Valor inicial de cada atributo em um personagem novo. */
export const ATRIBUTO_INICIAL = 1;
export const atributosIniciais = () => Object.fromEntries(CHAVES.map((c) => [c, ATRIBUTO_INICIAL])) as Record<ChaveAtributo, number>;

/** Missão como o paciente a vê. */
export type Missao = {
  codigo: string;
  titulo: string;
  local: string;
  descricao: string;
  nivel: number; // nível mínimo do paciente
  xp: number | null;
  duracao: number; // segundos
};
