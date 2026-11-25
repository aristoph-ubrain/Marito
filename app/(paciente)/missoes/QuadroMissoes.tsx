"use client";

import { useEffect, useRef, useState } from "react";
import { Anotacao, BarraXp, GradeAtributos, Rodape, Titulo } from "@/components/ui";
import { ATRIBUTOS, siglaDe, type ChaveAtributo, type Missao } from "@/lib/mock";
import { atendeRequisitos, dois, LIMITE_MISSOES_DIA, milhar, mmss, xpParaProximoNivel } from "@/lib/regras";

type Filtro = "todas" | "liberadas" | "bloqueadas" | "andamento";
const FILTROS: [Filtro, string][] = [
  ["todas", "TODAS"],
  ["liberadas", "LIBERADAS"],
  ["bloqueadas", "BLOQUEADAS"],
  ["andamento", "EM ANDAMENTO"],
];

export function QuadroMissoes({
  missoes,
  atributos,
  nivel,
  xpInicial,
  feitasHoje,
}: {
  missoes: Missao[];
  atributos: Record<ChaveAtributo, number>;
  nivel: number;
  xpInicial: number;
  feitasHoje: number;
}) {
  const [xp, setXp] = useState(xpInicial);
  const [hoje, setHoje] = useState(feitasHoje);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [emCurso, setEmCurso] = useState<{ codigo: string; progresso: number } | null>(null);
  const [concluidas, setConcluidas] = useState<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  // Etapa 4: o início/fim passará a ser gravado no servidor (funciona com o jogo fechado).
  const iniciar = (m: Missao) => {
    if (timer.current) clearInterval(timer.current);
    let t0: number | null = null;
    setEmCurso({ codigo: m.codigo, progresso: 0 });
    timer.current = setInterval(() => {
      const agora = Date.now();
      t0 ??= agora;
      const p = Math.min(1, (agora - t0) / (m.duracao * 1000));
      if (p >= 1) {
        if (timer.current) clearInterval(timer.current);
        setEmCurso(null);
        setXp((x) => x + (m.xp ?? 0));
        setHoje((h) => h + 1);
        setConcluidas((c) => ({ ...c, [m.codigo]: (c[m.codigo] ?? 0) + 1 }));
      } else {
        setEmCurso({ codigo: m.codigo, progresso: p });
      }
    }, 200);
  };

  const interromper = () => {
    if (timer.current) clearInterval(timer.current);
    setEmCurso(null);
  };

  const limite = hoje >= LIMITE_MISSOES_DIA;
  const ocupado = emCurso !== null || limite;
  const total = xpParaProximoNivel(nivel);

  const lista = missoes
    .map((m) => ({ m, ok: atendeRequisitos(atributos, m.requisitos), rodando: emCurso?.codigo === m.codigo }))
    .filter(({ ok, rodando }) =>
      filtro === "todas" || (filtro === "liberadas" && ok) || (filtro === "bloqueadas" && !ok) || (filtro === "andamento" && rodando),
    );

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>IV. ORDENS DE ATIVIDADE</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Atividades internas liberadas conforme a avaliação de atributos do paciente. Uma atividade por vez, até {LIMITE_MISSOES_DIA} por dia.
        </p>
        <div className="flex flex-col gap-2 border-2 border-tinta px-3 py-2.5">
          <div className="flex justify-between text-[13px]">
            <span><b>Pront. 0108</b> · Nv. {dois(nivel)}</span>
            <span>{milhar(xp)} / {milhar(total)} XP</span>
          </div>
          <BarraXp atual={xp} total={total} />
          <div className="flex justify-between border-t border-dashed border-tinta pt-1.5 text-xs">
            <span>MISSÕES HOJE: <b>{hoje} / {LIMITE_MISSOES_DIA}</b></span>
            <span>Reinicia à meia-noite</span>
          </div>
          <GradeAtributos itens={ATRIBUTOS.map((a) => ({ sigla: a.sigla, valor: atributos[a.chave] }))} />
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar missões">
        {FILTROS.map(([f, rotulo]) => (
          <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f}
            className={`btn min-h-10 px-2 text-xs ${filtro === f ? "btn-escuro" : ""}`}>
            {rotulo}
          </button>
        ))}
      </div>

      {limite && (
        <p role="status" className="m-0 border border-dashed border-carimbo p-2 text-xs text-carimbo">
          Limite diário atingido ({LIMITE_MISSOES_DIA}/{LIMITE_MISSOES_DIA}). Novas ordens após a meia-noite, horário de Brasília.
        </p>
      )}

      <Anotacao>Ninguém autorizou a OS-019. Ela continua aparecendo.</Anotacao>

      <div className="flex flex-col gap-3.5">
        {lista.map(({ m, ok, rodando }) => {
          const cor = ok ? "var(--color-verde)" : "var(--color-carimbo)";
          return (
            <article key={m.codigo} className={`flex flex-col gap-2 border-[1.5px] border-tinta p-3 ${ok ? "bg-papel-claro" : "bg-papel-escuro"}`}>
              <div className="flex justify-between border-b border-dashed border-tinta pb-1.5 text-[11px] tracking-[.5px]">
                <span>{m.codigo}</span>
                <span>{m.local}</span>
              </div>
              <div className="flex items-start gap-2">
                <h3 className="m-0 flex-1 font-maquina text-[17px] font-normal leading-tight">{m.titulo}</h3>
                <span className="whitespace-nowrap px-1.5 py-0.5 font-maquina text-[11px] tracking-[1px]"
                  style={{ border: `2px solid ${cor}`, color: cor, transform: "rotate(-5deg)" }}>
                  {ok ? "LIBERADA" : "ACESSO NEGADO"}
                </span>
              </div>
              <p className="m-0 text-xs leading-snug opacity-90">{m.descricao}</p>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] tracking-[.5px]">REQUISITOS</span>
                <div className="flex flex-wrap gap-1.5">
                  {m.requisitos.map((r) => {
                    const tem = atributos[r.atributo];
                    const atende = tem >= r.minimo;
                    return (
                      <span key={r.atributo}
                        className={`border-[1.5px] px-1.5 py-0.5 text-xs ${atende ? "border-tinta" : "border-dashed border-carimbo text-carimbo"}`}>
                        {siglaDe(r.atributo)} {dois(r.minimo)} {atende ? "✓" : `· você ${dois(tem)}`}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between border-t border-dashed border-tinta pt-1.5 text-[13px]">
                <span><b>Recompensa:</b> {m.xp == null ? "+??? XP" : `+${m.xp} XP`}</span>
                <span>Duração {mmss(m.duracao)}</span>
              </div>

              {rodando && emCurso && (
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 border-[1.5px] border-verde p-0.5">
                    <div className="h-full bg-verde" style={{ width: `${Math.round(emCurso.progresso * 100)}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>EM ANDAMENTO · restam {mmss((1 - emCurso.progresso) * m.duracao)}</span>
                    <button type="button" className="btn" onClick={interromper}>INTERROMPER</button>
                  </div>
                </div>
              )}
              {ok && !rodando && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] opacity-75">
                    {concluidas[m.codigo] ? `Concluída ${concluidas[m.codigo]}×` : "Nunca realizada"}
                  </span>
                  <button type="button" className="btn btn-pri px-4 text-sm tracking-[1px]" disabled={ocupado} onClick={() => iniciar(m)}>
                    INICIAR
                  </button>
                </div>
              )}
              {!ok && <p className="m-0 text-xs text-carimbo">Avaliação insuficiente. Distribua pontos em ATRIBUTOS.</p>}
            </article>
          );
        })}
      </div>

      <Rodape>
        Ordens emitidas pela coordenação. Atividades fora desta lista não devem ser realizadas, mesmo quando solicitadas por funcionários.
      </Rodape>
    </>
  );
}
