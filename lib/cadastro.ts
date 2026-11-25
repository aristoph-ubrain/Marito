/**
 * Regras dos campos de identificação do cadastro.
 * Usadas no formulário (para avisar na hora) e no servidor (que é quem decide).
 */

export const LIMITE_NOME = 30;
export const LIMITE_PROFISSAO = 25;
export const LIMITE_RELATO = 2000;

/** O relato de entrada é obrigatório. */
export function validarRelato(relato: string): string | null {
  const r = relato.trim();
  if (!r) return "Escreva o relato de entrada. Ele é obrigatório.";
  if (r.length > LIMITE_RELATO) return `O relato pode ter no máximo ${LIMITE_RELATO} caracteres.`;
  return null;
}
export const IDADE_MIN = 18;
export const IDADE_MAX = 99;
export const ALTURA_MIN = 1.0;
export const ALTURA_MAX = 2.3;

export const NACIONALIDADES = [
  "Brasileira",
  "Argentina",
  "Uruguaia",
  "Paraguaia",
  "Chilena",
  "Colombiana",
  "Peruana",
  "Outra",
] as const;

/** Formata o que foi digitado como "1,76" (só dígitos, vírgula automática). */
export function mascaraAltura(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 3);
  return d.length <= 1 ? d : `${d[0]},${d.slice(1)}`;
}

type Identificacao = { nome: string; idade: string; sexo: string; altura: string; nacionalidade: string; profissao: string };
export type IdentificacaoValida = { nome: string; idade: number; sexo: "M" | "F" | "O"; altura: string; nacionalidade: string; profissao: string };

/** Devolve a mensagem de erro, ou os dados já limpos. */
export function validarIdentificacao(d: Identificacao): string | IdentificacaoValida {
  const nome = d.nome.trim().replace(/\s+/g, " ");
  if (!nome) return "Informe o nome do paciente.";
  if (nome.length > LIMITE_NOME) return `O nome pode ter no máximo ${LIMITE_NOME} caracteres.`;

  const idade = Number(d.idade.trim());
  if (!/^\d{2}$/.test(d.idade.trim()) || idade < IDADE_MIN || idade > IDADE_MAX)
    return `Informe uma idade entre ${IDADE_MIN} e ${IDADE_MAX} anos.`;

  if (d.sexo !== "M" && d.sexo !== "F" && d.sexo !== "O") return "Selecione o sexo.";

  const alt = d.altura.trim();
  const metros = Number(alt.replace(",", "."));
  if (!/^\d,\d{2}$/.test(alt) || metros < ALTURA_MIN || metros > ALTURA_MAX)
    return "Informe a altura no formato 1,76 (entre 1,00 e 2,30 m).";

  if (!(NACIONALIDADES as readonly string[]).includes(d.nacionalidade)) return "Selecione a nacionalidade.";

  const profissao = d.profissao.trim().replace(/\s+/g, " ");
  if (!profissao) return "Informe a profissão.";
  if (profissao.length > LIMITE_PROFISSAO) return `A profissão pode ter no máximo ${LIMITE_PROFISSAO} caracteres.`;

  return { nome, idade, sexo: d.sexo, altura: `${alt} m`, nacionalidade: d.nacionalidade, profissao };
}
