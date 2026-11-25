"use client";

import { useState } from "react";
import { Anotacao, Rodape, Titulo } from "@/components/ui";
import type { TipoRegistro, historico as Historico } from "@/lib/mock";

type Filtro = "todos" | TipoRegistro;
const FILTROS: [Filtro, string][] = [
  ["todos", "TODOS"], ["ev", "EVOLUÇÃO"], ["os", "ATIVIDADES"], ["ac", "ACESSOS"], ["cv", "CONVÍVIO"],
];
const ETIQUETA: Record<TipoRegistro, { rotulo: string; cor: string }> = {
  ev: { rotulo: "EVOLUÇÃO", cor: "var(--color-verde)" },
  os: { rotulo: "ATIVIDADE", cor: "var(--color-tinta)" },
  ac: { rotulo: "ACESSO", cor: "var(--color-ocre)" },
  cv: { rotulo: "CONVÍVIO", cor: "var(--color-caneta)" },
};
const RASGO =
  "linear-gradient(135deg,#efe6d0 50%,transparent 50%) 0 0/14px 14px repeat-x,linear-gradient(225deg,#efe6d0 50%,transparent 50%) 0 0/14px 14px repeat-x,#2a211a";

export function LivroOcorrencias({ dias }: { dias: typeof Historico }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const visiveis = dias
    .map((d) => ({ ...d, registros: d.registros.filter((r) => filtro === "todos" || r.tipo === filtro) }))
    .filter((d) => (d.rasgado ? filtro === "todos" : d.registros.length > 0));

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>VII. LIVRO DE OCORRÊNCIAS</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Registro cronológico do paciente 0108. Lançamentos automáticos do sistema e da equipe.
        </p>
        <div className="grid grid-cols-2 border-2 border-tinta">
          {[["NÍVEL", "03"], ["XP TOTAL", "3.740"], ["MISSÕES", "07"], ["ALAS LIBERADAS", "05"]].map(([r, v], i) => (
            <div key={r} className={`flex flex-col px-2.5 py-2 ${i % 2 === 0 ? "border-r border-tinta" : ""} ${i < 2 ? "border-b border-tinta" : ""}`}>
              <span className="text-[11px]">{r}</span>
              <b className="font-maquina text-[22px] font-normal">{v}</b>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar registros">
        {FILTROS.map(([f, r]) => (
          <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}
            className={`btn min-h-10 px-2 text-xs ${filtro === f ? "btn-escuro" : ""}`}>{r}</button>
        ))}
      </div>

      <section className="flex flex-col gap-[18px]">
        {visiveis.map((d) =>
          d.rasgado ? (
            <div key={d.data} className="-mx-[18px] flex flex-col gap-1.5">
              <div aria-hidden="true" className="h-3.5" style={{ background: RASGO }} />
              <div className="px-[18px] py-1 text-center text-xs tracking-[.5px]">{d.data}</div>
              <div aria-hidden="true" className="h-3.5 -scale-y-100" style={{ background: RASGO }} />
            </div>
          ) : (
            <div key={d.data} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <b className="whitespace-nowrap font-maquina text-base font-normal">{d.data}</b>
                <div className="flex-1 border-t-[1.5px] border-tinta" />
              </div>
              <ol className="m-0 ml-1.5 flex list-none flex-col border-l-2 border-tinta p-0">
                {d.registros.map((r) => (
                  <li key={r.codigo + r.hora} className={`relative flex flex-col gap-1 pt-1 pb-3 pl-4 ${r.futuro ? "opacity-55" : ""}`}>
                    <span aria-hidden="true" className="absolute top-[7px] -left-1.5 h-2.5 w-2.5 rounded-full border-2 border-tinta bg-papel" />
                    <div className="flex items-center gap-2 text-xs">
                      <b>{r.hora}</b>
                      <span className="whitespace-nowrap border px-1.5 text-[10px] tracking-[.5px]"
                        style={{ borderColor: ETIQUETA[r.tipo].cor, color: ETIQUETA[r.tipo].cor }}>{ETIQUETA[r.tipo].rotulo}</span>
                      <span className="opacity-70">{r.codigo}</span>
                    </div>
                    <div className="text-[13px] leading-snug">{r.texto}</div>
                    {r.xp && <div className="text-xs font-bold text-verde">{r.xp}</div>}
                    {r.nota && <Anotacao style={{ fontSize: 18 }}>{r.nota}</Anotacao>}
                  </li>
                ))}
              </ol>
            </div>
          ),
        )}
      </section>

      <Rodape>Lançamentos não podem ser editados ou removidos. Divergências devem ser relatadas à coordenação.</Rodape>
    </>
  );
}
