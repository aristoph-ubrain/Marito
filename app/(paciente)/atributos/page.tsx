import { BarraXp, Carimbo, Censura, Foto3x4, Titulo } from "@/components/ui";
import { paciente as p } from "@/lib/mock";
import { dois, milhar, PONTOS_POR_NIVEL, xpParaProximoNivel } from "@/lib/regras";
import { DistribuirPontos } from "./DistribuirPontos";

export default function AtributosPage() {
  const total = xpParaProximoNivel(p.nivel);
  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>I. IDENTIFICAÇÃO</Titulo>
        <div className="flex items-start gap-3.5">
          <div className="flex flex-1 flex-col gap-1 text-sm leading-snug">
            <div><b>Prontuário Nº:</b> {p.prontuario}</div>
            <div><b>Nome:</b> {p.nome}</div>
            <div><b>Classificação:</b> {p.classe}</div>
            <div><b>Nível atual:</b> {dois(p.nivel)}</div>
          </div>
          <Foto3x4 />
        </div>
        <Carimbo>CLASSE: {p.classe}</Carimbo>
      </section>

      <section className="flex flex-col gap-2.5">
        <Titulo>II. EXPERIÊNCIA</Titulo>
        <div className="flex justify-between text-sm">
          <span><b>XP acumulada:</b> {milhar(p.xp)}</span>
          <span><b>Próx.:</b> {milhar(total)}</span>
        </div>
        <BarraXp atual={p.xp} total={total} />
        <div className="text-xs">
          Faltam {milhar(total - p.xp)} XP para a próxima reavaliação. Cada nível concede {PONTOS_POR_NIVEL} pontos.
        </div>
        <div className="flex flex-col gap-1 border-t border-dashed border-tinta pt-2 text-xs">
          <b>HISTÓRICO DE EVOLUÇÃO</b>
          <span>— Nv. 02 → 03 · registro arquivado</span>
          <span>— Nv. 01 → 02 · <Censura>confidencial ala c</Censura></span>
        </div>
      </section>

      <DistribuirPontos atributos={p.atributos} pontos={p.pontos} />
    </>
  );
}
