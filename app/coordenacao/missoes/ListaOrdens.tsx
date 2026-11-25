"use client";

import Link from "next/link";
import { useState } from "react";
import { Titulo } from "@/components/ui";

type Situacao = "pub" | "ras" | "arq";
const ORDENS = [
  { codigo: "OS-011", titulo: "Inventário da Farmácia", ala: "TÉRREO", req: ["CON 03"], xp: 80, dur: "00:20", vezes: 42, autor: "Dr. ██████", sit: "pub" },
  { codigo: "OS-014", titulo: "Turno na Lavanderia", ala: "ALA B", req: ["FOR 03"], xp: 60, dur: "00:15", vezes: 57, autor: "Enf. R. Matos", sit: "pub" },
  { codigo: "OS-019", titulo: "Escutar o Quarto 112", ala: "ALA C", req: ["VÍN 05", "AFI 03"], xp: 220, dur: "00:40", vezes: 9, autor: "— não identificado", sit: "pub", protegida: true },
  { codigo: "OS-023", titulo: "Corredor das Portas Trancadas", ala: "ALA C", req: ["AGI 04", "SOR 04"], xp: 180, dur: "00:35", vezes: 3, autor: "Dr. ██████", sit: "pub" },
  { codigo: "OS-027", titulo: "Sessão com o Dr. ██████", ala: "CONSULTÓRIOS", req: ["DOM 03"], xp: 260, dur: "00:45", vezes: 1, autor: "Dr. ██████", sit: "pub" },
  { codigo: "OS-031", titulo: "Ronda na Capela", ala: "CAPELA", req: ["RIT 03", "AFI 04"], xp: 200, dur: "00:50", vezes: 0, autor: "Dr. ██████", sit: "ras" },
  { codigo: "OS-004", titulo: "Limpeza do Refeitório", ala: "TÉRREO", req: ["FOR 01"], xp: 20, dur: "00:10", vezes: 212, autor: "Enf. R. Matos", sit: "arq" },
  { codigo: "OS-008", titulo: "Contar os Leitos", ala: "ALA A", req: ["CON 01"], xp: 30, dur: "00:10", vezes: 98, autor: "Enf. noturno", sit: "arq" },
] as const;

const ROTULO: Record<Situacao, string> = { pub: "PUBLICADA", ras: "RASCUNHO", arq: "ARQUIVADA" };
const COR: Record<Situacao, string> = { pub: "var(--color-verde)", ras: "var(--color-ocre)", arq: "#6b5f4e" };
const ABAS: [Situacao, string][] = [["pub", "PUBLICADAS"], ["ras", "RASCUNHOS"], ["arq", "ARQUIVADAS"]];

export function ListaOrdens() {
  const [sit, setSit] = useState<Record<string, Situacao>>(() => Object.fromEntries(ORDENS.map((o) => [o.codigo, o.sit])));
  const [aba, setAba] = useState<Situacao>("pub");
  const [msg, setMsg] = useState("");
  const contar = (s: Situacao) => String(Object.values(sit).filter((x) => x === s).length).padStart(2, "0");

  // Etapa 4: publicar/arquivar virará server action.
  const alternar = (o: (typeof ORDENS)[number]) => {
    if ("protegida" in o && o.protegida) return setMsg(`${o.codigo}: ordem protegida. Não foi possível arquivar. Responsável não identificado.`);
    setMsg("");
    setSit((s) => ({ ...s, [o.codigo]: s[o.codigo] === "pub" ? "arq" : "pub" }));
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
        {ORDENS.filter((o) => sit[o.codigo] === aba).map((o) => {
          const s = sit[o.codigo];
          return (
            <article key={o.codigo} className="flex flex-col gap-2 border-[1.5px] border-tinta bg-papel-claro p-3">
              <div className="flex items-center justify-between border-b border-dashed border-tinta pb-1.5 text-[11px]">
                <span>{o.codigo} · {o.ala}</span>
                <span className="border-2 px-1.5 py-0.5 text-[10px] tracking-[1px]" style={{ borderColor: COR[s], color: COR[s] }}>{ROTULO[s]}</span>
              </div>
              <h3 className="m-0 font-maquina text-base font-normal">{o.titulo}</h3>
              <div className="flex flex-wrap gap-1.5">
                {o.req.map((r) => <span key={r} className="border-[1.5px] border-tinta px-1.5 py-0.5 text-[11px]">{r}</span>)}
              </div>
              <div className="flex justify-between text-xs">
                <span><b>+{o.xp} XP</b> · {o.dur}</span>
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
