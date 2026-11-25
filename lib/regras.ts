/**
 * Regras do MVP (ver claude/decisoes-mvp.md no projeto).
 * Funções puras: podem ser usadas no servidor e no cliente.
 */

export const PONTOS_POR_NIVEL = 3;
export const BONUS_ACESSO_DIARIO = 50;
export const BONUS_PRIMEIRA_VISITA_ALA = 200;
export const FUSO_HORARIO = "America/Sao_Paulo";

/** XP necessária para passar do nível `nivel` para o seguinte. */
export function xpParaProximoNivel(nivel: number): number {
  return Math.round(1000 * Math.pow(1.5, Math.max(0, nivel - 1)));
}

/**
 * Soma XP ao paciente e resolve subidas de nível.
 * `xp` é a XP acumulada dentro do nível atual.
 */
export function aplicarXp(estado: { nivel: number; xp: number; pontos: number }, ganho: number) {
  let { nivel, xp, pontos } = estado;
  xp += ganho;
  let niveisGanhos = 0;
  while (xp >= xpParaProximoNivel(nivel)) {
    xp -= xpParaProximoNivel(nivel);
    nivel += 1;
    pontos += PONTOS_POR_NIVEL;
    niveisGanhos += 1;
  }
  return { nivel, xp, pontos, niveisGanhos };
}

/** Data (AAAA-MM-DD) no horário de Brasília — chave do "dia" para contagem e bônus. */
export function diaBrasilia(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

/** "25/11" no horário de Brasília. */
export function dataCurta(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_HORARIO, day: "2-digit", month: "2-digit" }).format(data);
}

/** "03:17" no horário de Brasília. */
export function horaBrasilia(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_HORARIO, hour: "2-digit", minute: "2-digit", hour12: false }).format(data);
}

/** Uma missão em andamento termina quando passa a duração, mesmo com o jogo fechado. */
export function missaoConcluida(inicio: Date, duracaoSegundos: number, agora: Date): boolean {
  return agora.getTime() - inicio.getTime() >= duracaoSegundos * 1000;
}

export function atendeRequisitos(
  atributos: Record<string, number>,
  requisitos: { atributo: string; minimo: number }[],
): boolean {
  return requisitos.every((r) => (atributos[r.atributo] ?? 0) >= r.minimo);
}

export const dois = (n: number) => String(n).padStart(2, "0");
export const milhar = (n: number) => n.toLocaleString("pt-BR");
export const mmss = (segundos: number) => {
  const s = Math.max(0, Math.ceil(segundos));
  return `${dois(Math.floor(s / 60))}:${dois(s % 60)}`;
};
