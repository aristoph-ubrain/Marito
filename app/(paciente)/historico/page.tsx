import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { alaAcessivel, listarAlas } from "@/lib/alas";
import { pacienteAtual } from "@/lib/dal";
import { listarHistorico } from "@/lib/historico";
import { dataCurta, diaBrasilia, dois, horaBrasilia, milhar } from "@/lib/regras";
import { LivroOcorrencias, type DiaVisto } from "./LivroOcorrencias";

async function Livro() {
  const p = await pacienteAtual();
  const [registros, alas] = await Promise.all([listarHistorico(p.prontuario), listarAlas()]);
  const agora = new Date();
  const hoje = diaBrasilia(agora);
  const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);

  const dias: DiaVisto[] = [];
  for (const r of registros) {
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
  // Folhas arrancadas entre o primeiro e o segundo dia registrados.
  if (dias.length >= 3) dias.splice(dias.length - 1, 0, { chave: "rasgo", data: "FOLHAS AUSENTES", rasgado: true, registros: [] });
  // Um registro que ainda não deveria existir.
  dias.unshift({
    chave: "amanha",
    data: dataCurta(amanha),
    registros: [{ hora: "03:17", tipo: "ac", codigo: "AC-██", texto: "Acesso à Ala ██ concedido. Transferência agendada.", futuro: true, nota: "esse dia ainda não aconteceu" }],
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
