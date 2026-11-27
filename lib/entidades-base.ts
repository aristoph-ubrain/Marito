/**
 * Entidades invocadas com a Lua Negra. Só coleção e enfeite: não mudam XP nem missões.
 * Dados originais e funções sem banco (podem ir para o navegador). O Mestre edita nome e descrição (lib/entidades.ts).
 */

export type Raridade = "comum" | "incomum" | "rara" | "lendaria";
export type Entidade = { id: string; nome: string; raridade: Raridade; descricao: string };

/** Chance de achar uma Lua Negra ao concluir uma ordem (qualquer área). */
export const CHANCE_LUA = 0.01;
/** Máximo de luas que o Mestre deixa de uma vez. */
export const MAX_LUAS_ENTREGA = 5;
export const LIMITE_NOME_ENTIDADE = 32;
export const LIMITE_DESCRICAO_ENTIDADE = 160;

export const RARIDADES: Record<Raridade, { rotulo: string; cor: string }> = {
  comum: { rotulo: "COMUM", cor: "#5e5344" },
  incomum: { rotulo: "INCOMUM", cor: "#2f5d46" },
  rara: { rotulo: "RARA", cor: "#2c4a8a" },
  lendaria: { rotulo: "LENDÁRIA", cor: "#8a3b2e" },
};

export const ENTIDADES_ORIGINAIS: Entidade[] = [
  { id: "lencol", nome: "O Pálido da Lavanderia", raridade: "comum", descricao: "Um lençol que nunca seca. Fica de pé no corredor quando ninguém olha." },
  { id: "rato", nome: "Rato de Duas Sombras", raridade: "comum", descricao: "Uma sombra segue o rato. A outra segue você." },
  { id: "mariposa", nome: "Mariposa do Corredor", raridade: "comum", descricao: "Pousa sempre na lâmpada que vai queimar." },
  { id: "menino", nome: "Menino da Lanterna Apagada", raridade: "incomum", descricao: "Pede para você segurar a lanterna. Ela nunca acende." },
  { id: "gato", nome: "Gato Sem Reflexo", raridade: "incomum", descricao: "Dorme no seu leito. O espelho do quarto mostra o leito vazio." },
  { id: "enfermeira", nome: "A Enfermeira de Papel", raridade: "rara", descricao: "Recortada de um prontuário de 1974. Anota tudo o que você faz." },
  { id: "visitante", nome: "O Visitante das 03:17", raridade: "rara", descricao: "Bate na porta uma vez por noite. O relógio na cabeça dele está sempre certo." },
  { id: "aquilo", nome: "Aquilo que mora no 112", raridade: "lendaria", descricao: "████████████. Não tente invocar duas vezes." },
];

export const ehEntidade = (id: unknown): id is string => typeof id === "string" && ENTIDADES_ORIGINAIS.some((e) => e.id === id);

/**
 * Peso de cada entidade no sorteio (em % por Lua Negra). Somam 99: o sorteio é proporcional,
 * então cada uma sai com peso/99 (ex.: comum 20/99 ≈ 20,2%, lendária 1/99 ≈ 1%).
 */
export const PESO_ENTIDADE: Record<string, number> = {
  lencol: 20,
  rato: 20,
  mariposa: 20,
  menino: 14,
  gato: 14,
  enfermeira: 5,
  visitante: 5,
  aquilo: 1,
};
const PESO_TOTAL = Object.values(PESO_ENTIDADE).reduce((s, n) => s + n, 0);

/** Chance real de cada entidade por Lua Negra (0 a 1). */
export const chanceEntidade = (id: string) => (PESO_ENTIDADE[id] ?? 0) / PESO_TOTAL;

/** Sorteia a entidade pelo peso de cada uma. `r` entre 0 e 1 (o segundo número é ignorado). */
export function sortearEntidade(r: number, _r2?: number): Entidade {
  void _r2;
  let resto = r * PESO_TOTAL;
  for (const e of ENTIDADES_ORIGINAIS) {
    resto -= PESO_ENTIDADE[e.id] ?? 0;
    if (resto < 0) return e;
  }
  return ENTIDADES_ORIGINAIS[0];
}

/** Desenho de cada entidade (conteúdo de um SVG 80×80). Conteúdo nosso, sem dados do usuário. */
export const DESENHOS: Record<string, string> = {
  lencol: "<path d=\"M22 70c0-30 6-52 18-52s18 22 18 52l-6-5-6 6-6-6-6 6-6-6z\" fill=\"#f4efe2\" stroke=\"#2b2620\" stroke-width=\"2\"/><ellipse cx=\"34\" cy=\"38\" rx=\"3.5\" ry=\"5\" fill=\"#141018\"/><ellipse cx=\"46\" cy=\"38\" rx=\"3.5\" ry=\"5\" fill=\"#141018\"/>",
  rato: "<path d=\"M18 62c8 4 30 6 40-2\" stroke=\"#2b2620\" stroke-width=\"7\" opacity=\".25\" fill=\"none\"/><path d=\"M28 64c10 8 34 4 40-4\" stroke=\"#2b2620\" stroke-width=\"7\" opacity=\".18\" fill=\"none\"/><path d=\"M24 52c0-9 8-15 18-15 8 0 14 5 16 11l6 2-6 3c-2 5-8 8-16 8-10 0-18-3-18-9z\" fill=\"#5e5344\" stroke=\"#2b2620\" stroke-width=\"2\"/><circle cx=\"54\" cy=\"47\" r=\"1.8\" fill=\"#e6d6b0\"/><circle cx=\"34\" cy=\"38\" r=\"5\" fill=\"#5e5344\" stroke=\"#2b2620\" stroke-width=\"2\"/><path d=\"M24 54c-8 0-12 4-10 10\" stroke=\"#2b2620\" stroke-width=\"2\" fill=\"none\"/>",
  mariposa: "<path d=\"M40 30c-8-12-26-14-26 2 0 10 10 14 26 12zM40 30c8-12 26-14 26 2 0 10-10 14-26 12zM40 44c-6 4-18 10-16 18 3 6 12 0 16-8zM40 44c6 4 18 10 16 18-3 6-12 0-16-8z\" fill=\"#d9c79e\" stroke=\"#2b2620\" stroke-width=\"2\"/><circle cx=\"27\" cy=\"33\" r=\"4\" fill=\"#141018\"/><circle cx=\"53\" cy=\"33\" r=\"4\" fill=\"#141018\"/><circle cx=\"28\" cy=\"32\" r=\"1.2\" fill=\"#e6d6b0\"/><circle cx=\"54\" cy=\"32\" r=\"1.2\" fill=\"#e6d6b0\"/><path d=\"M40 26v28\" stroke=\"#2b2620\" stroke-width=\"3\"/><path d=\"M40 26l-5-8M40 26l5-8\" stroke=\"#2b2620\" stroke-width=\"1.5\"/>",
  menino: "<circle cx=\"36\" cy=\"28\" r=\"9\" fill=\"#2b2620\"/><path d=\"M26 70l2-26c2-6 14-6 16 0l2 26z\" fill=\"#2b2620\"/><circle cx=\"33\" cy=\"28\" r=\"1.4\" fill=\"#e6d6b0\"/><circle cx=\"39\" cy=\"28\" r=\"1.4\" fill=\"#e6d6b0\"/><path d=\"M46 50l10 4\" stroke=\"#2b2620\" stroke-width=\"2.5\"/><rect x=\"54\" y=\"50\" width=\"10\" height=\"14\" rx=\"2\" fill=\"#141018\" stroke=\"#2b2620\" stroke-width=\"2\"/><path d=\"M56 48h6\" stroke=\"#2b2620\" stroke-width=\"2\"/>",
  gato: "<rect x=\"48\" y=\"18\" width=\"22\" height=\"44\" rx=\"2\" fill=\"#efe2c2\" stroke=\"#2b2620\" stroke-width=\"2\"/><path d=\"M50 22l18 36\" stroke=\"#2b2620\" stroke-width=\".8\" opacity=\".4\"/><path d=\"M14 66c0-14 4-24 12-26l-3-10 7 7h6l7-7-3 10c8 2 12 12 12 26z\" fill=\"#2b2620\"/><circle cx=\"27\" cy=\"44\" r=\"2\" fill=\"#c9b54a\"/><circle cx=\"37\" cy=\"44\" r=\"2\" fill=\"#c9b54a\"/><path d=\"M50 66c8 0 10-6 6-10\" stroke=\"#2b2620\" stroke-width=\"3\" fill=\"none\"/>",
  enfermeira: "<path d=\"M40 14c6 0 9 4 9 9s-4 9-9 9-9-4-9-9 3-9 9-9z\" fill=\"#f4efe2\" stroke=\"#2b2620\" stroke-width=\"2\" stroke-dasharray=\"3 2\"/><path d=\"M32 13h16l-2-5H34z\" fill=\"#f4efe2\" stroke=\"#2b2620\" stroke-width=\"1.5\"/><path d=\"M39 9h2M40 8v2\" stroke=\"#8a3b2e\" stroke-width=\"1.5\"/><path d=\"M28 70l4-36h16l4 36zM32 38l-12 12M48 38l12 12\" fill=\"#f4efe2\" stroke=\"#2b2620\" stroke-width=\"2\" stroke-dasharray=\"3 2\"/><path d=\"M36 23h2M42 23h2\" stroke=\"#2b2620\" stroke-width=\"2\"/><path d=\"M37 28h6\" stroke=\"#8a3b2e\" stroke-width=\"1.5\"/>",
  visitante: "<path d=\"M34 72l2-40h8l2 40\" fill=\"#2b2620\"/><path d=\"M36 34l-10 26M44 34l10 26\" stroke=\"#2b2620\" stroke-width=\"3\"/><circle cx=\"40\" cy=\"20\" r=\"12\" fill=\"#efe2c2\" stroke=\"#2b2620\" stroke-width=\"2.5\"/><path d=\"M40 20l6 3M40 20l-1-7\" stroke=\"#2b2620\" stroke-width=\"2\"/><circle cx=\"40\" cy=\"20\" r=\"1.5\" fill=\"#2b2620\"/>",
  aquilo: "<circle cx=\"40\" cy=\"40\" r=\"28\" fill=\"#141018\" stroke=\"#2b2620\" stroke-width=\"2\"/><g fill=\"#e6d6b0\"><ellipse cx=\"30\" cy=\"32\" rx=\"3\" ry=\"2\"/><ellipse cx=\"48\" cy=\"28\" rx=\"2.4\" ry=\"1.6\"/><ellipse cx=\"42\" cy=\"44\" rx=\"4\" ry=\"2.6\"/><ellipse cx=\"27\" cy=\"48\" rx=\"2\" ry=\"1.4\"/><ellipse cx=\"54\" cy=\"46\" rx=\"2.6\" ry=\"1.8\"/><ellipse cx=\"38\" cy=\"56\" rx=\"2\" ry=\"1.3\"/></g><g fill=\"#8a3b2e\"><circle cx=\"42\" cy=\"44\" r=\"1.4\"/><circle cx=\"30\" cy=\"32\" r=\"1\"/></g>",
};
