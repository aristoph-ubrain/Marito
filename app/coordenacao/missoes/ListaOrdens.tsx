"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Titulo } from "@/components/ui";
import { siglaDe } from "@/lib/mock";
import type { Ordem, Situacao } from "@/lib/ordens";
import { dois, mmss } from "@/lib/regras";
import { alternarSituacao } from "./actions";

const ROTULO: Record<Situacao, string> = { pub: "PUBLICADA", ras: "RASCUNHO", arq: "ARQUIVADA" };
const COR: Record<Situacao, string> = { pub: "var(--color-verde)", ras: "var(--color-ocre)", arq: "#6b5f4e" };
const ABAS: [Situacao, string][] = [["pub", "PUBLICADAS"], ["ras", "RASCUNHOS"], ["arq", "ARQUIVADAS"]];

export function ListaOrdens({ ordens }: { ordens: Ordem[] }) {
  const [aba, setAba] = useState<Situacao>("pub");
  const [msg, setMsg] = useState("");
  const [, iniciar] = useTransition();
  const contar = (s: Situacao) => dois(ordens.filter((o) => o.situacao === s).length);

  const alternar = (o: Ordem) => {
    setMsg("");
    iniciar(async () => {
      const r = await alternarSituacao(o.codigo);
      if (!r.ok) setMsg(r.erro);
    });
  };

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>ORDENS DE ATIVIDADE</Titulo>
        <div className="grid grid-cols-3 border-2 border-tinta text-center">
          {ABAS.map(([s, r], i) => (
            <div key={s} className={`flex flex-col px-1 py-2 ${i < 2 ? "border-r border-tinta" : ""}`}>
              <b className="font-maquina text-[22px] font-normal">{contar(s)}</b>
              <span className="text-[10px]">{r}</span>
            </div>
          ))}
        </div>
        <Link href="/coordenacao/missoes/editor" className="btn btn-pri min-h-[50px] text-sm tracking-[1px]">+ NOVA MISSÃO</Link>
      </section>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar ordens">
        {ABAS.map(([s, r]) => (
          <button key={s} type="button" aria-pressed={aba === s} onClick={() => { setAba(s); setMsg(""); }}
            className={`btn min-h-10 px-2 text-xs ${aba === s ? "btn-escuro" : ""}`}>{r}</button>
        ))}
      </div>

      {msg && <p role="status" className="m-0 border border-dashed border-carimbo p-2 text-xs text-carimbo">{msg}</p>}

      <div className="flex flex-col gap-3">
        {ordens.filter((o) => o.situacao === aba).map((o) => {
          const s = o.situacao;
          return (
            <article key={o.codigo} className="flex flex-col gap-2 border-[1.5px] border-tinta bg-papel-claro p-3">
              <div className="flex items-center justify-between border-b border-dashed border-tinta pb-1.5 text-[11px]">
                <span>{o.codigo} · {o.ala}</span>
                <span className="border-2 px-1.5 py-0.5 text-[10px] tracking-[1px]" style={{ borderColor: COR[s], color: COR[s] }}>{ROTULO[s]}</span>
              </div>
              <h3 className="m-0 font-maquina text-base font-normal">{o.titulo}</h3>
              <div className="flex flex-wrap gap-1.5">
                {o.requisitos.map((r) => <span key={r.atributo} className="border-[1.5px] border-tinta px-1.5 py-0.5 text-[11px]">{siglaDe(r.atributo)} {dois(r.minimo)}</span>)}
              </div>
              <div className="flex justify-between text-xs">
                <span><b>+{o.xp} XP</b> · {mmss(o.duracao)}</span>
                <span className="opacity-75">{o.vezes ? `Concluída ${o.vezes}×` : "Nunca realizada"}</span>
              </div>
              <div className="text-[11px] opacity-75">Criada por: {o.autor}</div>
              <div className="flex gap-2">
                <Link href="/coordenacao/missoes/editor" className="btn flex-1 text-xs">EDITAR</Link>
                <button type="button" className="btn flex-1 text-xs" onClick={() => alternar(o)}>{s === "pub" ? "ARQUIVAR" : "PUBLICAR"}</button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
