"use client";

import Link from "next/link";
import { useState } from "react";
import { Anotacao, Rodape, Titulo } from "@/components/ui";
import type { Ala } from "@/lib/mock";
import { dois } from "@/lib/regras";

const HACHURA = "repeating-linear-gradient(45deg,#e2d7bd 0 5px,#efe6d0 5px 10px)";

/** Nome da ala secreta se revela letra a letra a partir do nível 6. */
function nomeSecreto(nome: string, nivel: number) {
  const n = Math.max(0, nivel - 5);
  const [cabeca, cauda] = [nome.slice(0, 4), nome.slice(4)];
  return cabeca + cauda.split("").map((c, i) => (i < n ? c : "█")).join("");
}

export function PlantaAlas({ alas, nivel }: { alas: Ala[]; nivel: number }) {
  const [sel, setSel] = useState<string | null>("C");
  const porId = Object.fromEntries(alas.map((a) => [a.id, a]));
  const aberta = (a: Ala) => nivel >= a.nivel;
  const nome = (a: Ala) => (a.secreta ? nomeSecreto(a.nome, nivel) : a.nome);
  const alternar = (id: string) => setSel((s) => (s === id ? null : id));

  const sala = ({ id, rotulo, extra, className = "" }: { id: string; rotulo: string; extra?: React.ReactNode; className?: string }) => {
    const a = porId[id];
    const ok = aberta(a);
    return (
      <button key={id} type="button" onClick={() => alternar(id)} aria-pressed={sel === id}
        aria-label={`${nome(a)}, ${ok ? "liberada" : "restrita"}`}
        className={`flex min-h-16 flex-col items-center justify-center gap-0.5 border-[1.5px] border-tinta p-1 text-[11px] tracking-[.5px] ${className} ${sel === id ? "outline-[3px] -outline-offset-[5px] outline-verde outline" : ""}`}
        style={{ background: ok ? "var(--color-papel-claro)" : HACHURA, color: ok ? undefined : "#6b5f4e", borderStyle: a.secreta ? "dashed" : undefined }}>
        <b>{rotulo}</b>
        {extra ?? <span>nv {a.secreta && !ok ? "??" : dois(a.nivel)}{ok ? " ✓" : ""}</span>}
      </button>
    );
  };

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>V. ALAS — PLANTA DE ACESSO</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          O acesso às alas é liberado conforme o nível do paciente. Áreas hachuradas permanecem restritas.
        </p>
        <div className="flex items-center justify-between border-2 border-tinta px-3 py-2.5">
          <span className="text-[13px]">NÍVEL DE ACESSO</span>
          <span className="font-maquina text-[28px]">{dois(nivel)}</span>
        </div>
      </section>

      <section className="flex flex-col gap-2 border-2 border-tinta bg-[#f4ecd8] p-2.5">
        <div className="flex justify-between text-[11px] tracking-[.5px]"><span>PLANTA DE EVACUAÇÃO · BLOCO 1</span><span>N ↑</span></div>
        <div className="grid grid-cols-3 gap-1">
          {sala({ id: "P", rotulo: "CAPELA" })}
          {sala({ id: "C", rotulo: "ALA C", className: "col-span-2" })}
          {sala({ id: "B", rotulo: "ALA B" })}
          {sala({ id: "A", rotulo: "ALA A", extra: <span className="bg-carimbo px-1 text-[#f4efe2]">VOCÊ ESTÁ AQUI</span> })}
          {sala({ id: "K", rotulo: "CONSULT." })}
          {sala({ id: "T", rotulo: "TÉRREO", className: "col-span-3", extra: <span>recepção · farmácia · refeitório</span> })}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 border-t-[1.5px] border-dashed border-tinta" />
          <span className="text-[10px]">ESCADA DE SERVIÇO ↓</span>
        </div>
        {sala({ id: "X", rotulo: nome(porId.X) })}
        <div className="flex flex-wrap gap-3.5 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-3 w-3 border-[1.5px] border-tinta bg-papel-claro" />liberada</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 border-[1.5px] border-tinta" style={{ background: HACHURA }} />restrita</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 border-[1.5px] border-dashed border-tinta" />não consta</span>
        </div>
      </section>

      <Anotacao>A escada de serviço tem mais degraus descendo do que subindo.</Anotacao>

      <section className="flex flex-col gap-2.5">
        {alas.map((a) => {
          const ok = aberta(a);
          const aberto = sel === a.id;
          const cor = ok ? "var(--color-verde)" : "var(--color-carimbo)";
          return (
            <div key={a.id} className="flex flex-col">
              <button type="button" onClick={() => alternar(a.id)} aria-expanded={aberto}
                className={`flex w-full flex-col gap-1.5 border-tinta p-3 text-left ${aberto ? "border-[3px]" : "border-[1.5px]"} ${ok ? "bg-papel-claro" : "bg-papel-escuro"}`}>
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-maquina text-[17px]">{nome(a)}</span>
                    <span className="text-xs opacity-85">{a.sub}</span>
                  </div>
                  <span className="whitespace-nowrap px-1.5 py-0.5 font-maquina text-[11px] tracking-[1px]"
                    style={{ border: `2px solid ${cor}`, color: cor, transform: "rotate(-4deg)" }}>
                    {ok ? "LIBERADA" : a.secreta ? "NÃO CONSTA" : "RESTRITA"}
                  </span>
                </div>
                <div className="flex w-full justify-between border-t border-dashed border-tinta pt-1.5 text-xs">
                  <span>Nível exigido: <b>{a.secreta && !ok ? "??" : dois(a.nivel)}</b></span>
                  <span>Missões: <b>{a.missoes}</b></span>
                </div>
              </button>
              {aberto && (
                <div className="flex flex-col gap-2 border-[3px] border-t-0 border-tinta bg-papel-campo p-3">
                  <span className="text-[11px] tracking-[.5px]">OCORRÊNCIAS RECENTES</span>
                  {(a.secreta && !ok ? ["Registro inexistente."] : a.ocorrencias).map((o) => (
                    <div key={o} className="text-xs leading-snug">— {o}</div>
                  ))}
                  {ok ? (
                    <Link href="/missoes" className="btn btn-pri self-start tracking-[1px]">VER MISSÕES DA ALA →</Link>
                  ) : (
                    <p className="m-0 text-xs text-carimbo">
                      {a.secreta ? "Este setor não existe. Solicitação registrada." : `Acesso a partir do nível ${dois(a.nivel)}. Seu nível: ${dois(nivel)}.`}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <Rodape>Planta revisada em 1998. Alterações estruturais posteriores não constam neste documento.</Rodape>
    </>
  );
}
