/**
 * Monta o livro de ocorrências (histórico) a partir dos lançamentos e das anotações da equipe.
 * Usado pela tela do paciente e pelo painel da coordenação. Sem acesso ao banco.
 */
import type { Registro, TipoRegistro } from "./historico";
import { dataCurta, diaBrasilia, horaBrasilia, milhar } from "./regras";

export type RegistroVisto = { hora: string; tipo: TipoRegistro; codigo: string; texto: string; xp?: string; nota?: string; futuro?: boolean; vezes?: number };
export type DiaVisto = { chave: string; data: string; rasgado?: boolean; registros: RegistroVisto[] };

type Lancamento = Pick<Registro, "em" | "tipo" | "codigo" | "texto"> & { xp?: number };

/** Agrupa por dia (Brasília), do mais novo para o mais antigo. Lançamentos iguais no mesmo dia viram um só, com "×N" e a XP somada. */
export function montarDias(registros: Lancamento[], anotacoes: { em: Date | string; autor: string; texto: string }[], agora = new Date()): DiaVisto[] {
  const hoje = diaBrasilia(agora);
  const notas: Lancamento[] = anotacoes.map((a) => ({ em: new Date(a.em), tipo: "eq", codigo: "EQ", texto: `${a.autor}: ${a.texto}` }));
  const todos = [...registros, ...notas].sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime());

  const dias: DiaVisto[] = [];
  const grupos = new Map<string, { vezes: number; xp: number; i: number }>();
  for (const r of todos) {
    const em = new Date(r.em);
    const chave = diaBrasilia(em);
    let dia = dias.find((d) => d.chave === chave);
    if (!dia) {
      dia = { chave, data: dataCurta(em) + (chave === hoje ? " · HOJE" : ""), registros: [] };
      dias.push(dia);
    }
    const chaveGrupo = `${chave}|${r.tipo}|${r.codigo}|${r.texto}`;
    const g = grupos.get(chaveGrupo);
    if (g) {
      // A lista vem da mais nova para a mais antiga: a hora mostrada é a da última vez.
      g.vezes += 1;
      g.xp += r.xp ?? 0;
      const reg = dia.registros[g.i];
      reg.vezes = g.vezes;
      reg.xp = g.xp ? `+${milhar(g.xp)} XP` : undefined;
      continue;
    }
    grupos.set(chaveGrupo, { vezes: 1, xp: r.xp ?? 0, i: dia.registros.length });
    dia.registros.push({ hora: horaBrasilia(em), tipo: r.tipo, codigo: r.codigo, texto: r.texto, xp: r.xp ? `+${milhar(r.xp)} XP` : undefined });
  }
  return dias;
}
