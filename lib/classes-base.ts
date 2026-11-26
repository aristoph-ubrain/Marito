/**
 * Partes das classes sem banco: tipos, cores e limites.
 * Pode ser importado por componentes do navegador (lib/classes.ts não pode: usa o MongoDB).
 */
import type { OpcaoFoto } from "@/components/Figurinha";

export type Classe = {
  id: string;
  nome: string;
  descricao: string;
  cor: string; // uma de CORES_CARIMBO
  figurinha: OpcaoFoto; // sugerida na troca de foto
  padrao?: boolean; // classe de quem é internado (não pode ser apagada)
  ordem: number;
};

export const CORES_CARIMBO = [
  { nome: "Vermelho carimbo", valor: "#8a3b2e" },
  { nome: "Verde", valor: "#2f5d46" },
  { nome: "Azul tinta", valor: "#2c4a8a" },
  { nome: "Roxo", valor: "#5a3a6e" },
  { nome: "Ocre", valor: "#7a5a2a" },
  { nome: "Preto", valor: "#2b2620" },
] as const;
export const ehCor = (c: unknown): c is string => CORES_CARIMBO.some((x) => x.valor === c);

export const NOME_PADRAO = "ANÔMALO";
export const LIMITE_NOME_CLASSE = 18;
export const LIMITE_DESCRICAO_CLASSE = 240;

/** Nome em maiúsculas, sem espaços duplos. */
export const limparNomeClasse = (n: unknown) =>
  typeof n === "string" ? n.replace(/\s+/g, " ").trim().toLocaleUpperCase("pt-BR").slice(0, LIMITE_NOME_CLASSE) : "";
