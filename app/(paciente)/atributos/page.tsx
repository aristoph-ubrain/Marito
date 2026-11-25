import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { FotoProntuario } from "@/components/Figurinha";
import { BarraXp, Carimbo, Titulo } from "@/components/ui";
import { pacienteAtual } from "@/lib/dal";
import { dois, milhar, PONTOS_POR_NIVEL, xpParaProximoNivel } from "@/lib/regras";
import { DistribuirPontos } from "./DistribuirPontos";

async function Avaliacao() {
  const p = await pacienteAtual();
  const total = xpParaProximoNivel(p.nivel);
  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>I. IDENTIFICAÇÃO</Titulo>
        <div className="flex items-start gap-3.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm leading-snug">
            <div><b>Prontuário Nº:</b> {p.prontuario}</div>
            <div><b>Nome:</b> {p.nome}</div>
            <div><b>Classificação:</b> {p.classe}</div>
            <div><b>Nível atual:</b> {dois(p.nivel)}</div>
          </div>
          <FotoProntuario opcao={p.foto} prontuario={p.prontuario} prefixo="aval" />
        </div>
        <Carimbo>CLASSE: {p.classe}</Carimbo>
      </section>

      <section className="flex flex-col gap-2.5">
        <Titulo>II. EXPERIÊNCIA</Titulo>
        <div className="flex justify-between text-sm">
          <span><b>XP no nível:</b> {milhar(p.xp)}</span>
          <span><b>Próx.:</b> {milhar(total)}</span>
        </div>
        <BarraXp atual={p.xp} total={total} />
        <div className="text-xs">
          Faltam {milhar(total - p.xp)} XP para a próxima reavaliação. Cada nível concede {PONTOS_POR_NIVEL} pontos.
        </div>
        <div className="text-xs opacity-80">XP total registrada: {milhar(p.xpTotal)}</div>
      </section>

      <DistribuirPontos atributos={p.atributos} pontos={p.pontos} />
    </>
  );
}

export default function AtributosPage() {
  return (
    <Suspense fallback={<Carregando texto="Carregando a avaliação…" />}>
      <Avaliacao />
    </Suspense>
  );
}
