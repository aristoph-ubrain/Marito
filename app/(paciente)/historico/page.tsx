import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { alaAcessivel, listarAlas } from "@/lib/alas";
import { pacienteAtual } from "@/lib/dal";
import { listarHistorico } from "@/lib/historico";
import { dataCurta, diaBrasilia, dois, horaBrasilia, milhar } from "@/lib/regras";
import { anotacaoDoDia, previsaoDeAmanha } from "./fantasma";
import { LivroOcorrencias, type DiaVisto } from "./LivroOcorrencias";

async function Livro() {
  const p = await pacienteAtual();
  const [registros, alas] = await Promise.all([listarHistorico(p.prontuario), listarAlas()]);
  const agora = new Date();
  const hoje = diaBrasilia(agora);
  const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);

  // As anotações da equipe ficam na ficha; aqui entram no livro junto com os demais lançamentos.
  const notas = p.anotacoes.map((a) => ({ em: a.em, tipo: "eq" as const, codigo: "EQ", texto: `${a.autor}: ${a.texto}`, xp: undefined }));
  const todos = [...registros, ...notas].sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime());

  const dias: DiaVisto[] = [];
  for (const r of todos) {
    const em = new Date(r.em);
    const chave = diaBrasilia(em);
    let dia = dias.find((d) => d.chave === chave);
    if (!dia) {
      dia = { chave, data: dataCurta(em) + (chave === hoje ? " · HOJE" : ""), registros: [] };
      dias.push(dia);
    }
    dia.registros.push({
      hora: horaBrasilia(em),
      tipo: r.tipo,
      codigo: r.codigo,
      texto: r.texto,
      xp: r.xp ? `+${milhar(r.xp)} XP` : undefined,
    });
  }
  // O 0112 deixa uma anotação por dia às 03:17 (hoje, só depois desse horário). Sem filtro próprio: aparece em TODOS.
  const passou0317 = horaBrasilia(agora) >= "03:17";
  for (const d of dias) {
    if (d.chave === hoje && !passou0317) continue;
    d.registros.push(anotacaoDoDia(d.chave, p.prontuario));
    d.registros.sort((a, b) => b.hora.localeCompare(a.hora));
  }
  // Folhas arrancadas entre o primeiro e o segundo dia registrados.
  if (dias.length >= 3) dias.splice(dias.length - 1, 0, { chave: "rasgo", data: "FOLHAS AUSENTES", rasgado: true, registros: [] });
  // Um registro que ainda não deveria existir.
  dias.unshift({
    chave: "amanha",
    data: dataCurta(amanha),
    registros: [previsaoDeAmanha(diaBrasilia(amanha), p.prontuario)],
  });

  const missoes = Object.values(p.concluidas).reduce((s, n) => s + n, 0);
  const liberadas = alas.filter((a) => !a.secreta && alaAcessivel(a, p.nivel)).length;

  return (
    <LivroOcorrencias
      prontuario={p.prontuario}
      resumo={[["NÍVEL", dois(p.nivel)], ["XP TOTAL", milhar(p.xpTotal)], ["MISSÕES", dois(missoes)], ["ALAS LIBERADAS", dois(liberadas)]]}
      dias={dias}
    />
  );
}

export default function HistoricoPage() {
  return (
    <Suspense fallback={<Carregando texto="Abrindo o livro de ocorrências…" />}>
      <Livro />
    </Suspense>
  );
}
