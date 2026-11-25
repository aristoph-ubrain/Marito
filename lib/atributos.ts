export type ChaveAtributo = "FOR" | "AGI" | "SOR" | "CON" | "AFI" | "VIN" | "COM" | "RIT" | "DOM" | "SIM";

export const ATRIBUTOS: { chave: ChaveAtributo; sigla: string; nome: string; descricao: string }[] = [
  { chave: "FOR", sigla: "FOR", nome: "Força", descricao: "Potência muscular, dano físico e capacidade de carregar peso." },
  { chave: "AGI", sigla: "AGI", nome: "Agilidade", descricao: "Velocidade, reflexos, esquiva e movimentos rápidos." },
  { chave: "SOR", sigla: "SOR", nome: "Sorte", descricao: "Influência sobre acontecimentos imprevisíveis." },
  { chave: "CON", sigla: "CON", nome: "Conhecimento", descricao: "Domínio de ciências, ocultismo, história e conhecimentos específicos." },
  { chave: "AFI", sigla: "AFI", nome: "Afinidade", descricao: "Sensibilidade e conexão com o paranormal, rituais e manifestações sobrenaturais." },
  { chave: "VIN", sigla: "VÍN", nome: "Vínculo", descricao: "Conexão e comunicação com entidades e espíritos." },
  { chave: "COM", sigla: "COM", nome: "Comando", descricao: "Capacidade de controlar e direcionar manifestações sobrenaturais." },
  { chave: "RIT", sigla: "RIT", nome: "Ritualismo", descricao: "Capacidade de realizar rituais e procedimentos ocultos." },
  { chave: "DOM", sigla: "DOM", nome: "Dominação", descricao: "Capacidade de resistir ou impor sua vontade sobre outras consciências." },
  { chave: "SIM", sigla: "SIM", nome: "Simbiose", descricao: "Capacidade de compartilhar corpo, sentidos e habilidades com entidades." },
];

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
  requisitos: { atributo: ChaveAtributo; minimo: number }[];
  xp: number | null;
  duracao: number; // segundos
};
