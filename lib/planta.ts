/** Planta do hospital (sem acesso ao banco: pode ser usada no navegador). */

/** Desenho da planta: colunas (de 6) e altura de cada área. `abaixo` = depois da escada de serviço. */
export const PLANTA: { id: string; colunas: 2 | 3 | 4 | 6; altura: number; abaixo?: boolean }[] = [
  { id: "P", colunas: 2, altura: 96 },
  { id: "C", colunas: 4, altura: 96 },
  { id: "D", colunas: 3, altura: 104 },
  { id: "I", colunas: 3, altura: 104 },
  { id: "K", colunas: 3, altura: 88 },
  { id: "E", colunas: 3, altura: 88 },
  { id: "F", colunas: 2, altura: 84 },
  { id: "R", colunas: 4, altura: 84 },
  { id: "S", colunas: 6, altura: 72, abaixo: true },
  { id: "X", colunas: 6, altura: 52, abaixo: true },
];
