"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Anotacao, Rodape, Titulo } from "@/components/ui";
import { BONUS_PRIMEIRA_VISITA_ALA, dois } from "@/lib/regras";
import { PLANTA } from "@/lib/planta";
import { entrarNaAla } from "../actions";

const COLUNAS = { 2: "col-span-2", 3: "col-span-3", 4: "col-span-4", 6: "col-span-6" } as const;

export type AlaVista = {
  id: string;
  nome: string;
  sub: string;
  nivel: number;
  interditada: boolean;
  secreta: boolean;
  ocorrencias: string[];
  missoes: number | "?";
};

const HACHURA = "repeating-linear-gradient(45deg,#e2d7bd 0 5px,#efe6d0 5px 10px)";

export function PlantaAlas({
  alas,
  nivel,
  alaAtualId,
  visitadasIds,
}: {
  alas: AlaVista[];
  nivel: number;
  alaAtualId: string;
  visitadasIds: string[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; texto: string; ok: boolean } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const porId = Object.fromEntries(alas.map((a) => [a.id, a]));
  const aberta = (a: AlaVista) => !a.interditada && nivel >= a.nivel;
  const nome = (a: AlaVista) => a.nome; // a ala secreta já chega mascarada do servidor
  const alternar = (id: string) => { setSel((s) => (s === id ? null : id)); setMsg(null); };

  const entrar = (a: AlaVista) =>
    iniciar(async () => {
      const r = await entrarNaAla(a.id);
      setMsg({ id: a.id, texto: r.ok ? r.msg ?? "Entrada registrada." : r.erro, ok: r.ok });
      router.refresh();
    });

  /** Uma área na planta; tocar abre a ficha dela logo abaixo. */
  const sala = ({ id, className = "", altura = 64 }: { id: string; className?: string; altura?: number }) => {
    const a = porId[id];
    if (!a) return null;
    const ok = aberta(a);
    const aqui = alaAtualId === id;
    const rotulo = nome(a);
    return (
      <button key={id} type="button" onClick={() => alternar(id)} aria-pressed={sel === id}
        aria-label={`${rotulo}, ${ok ? "liberada" : a.interditada ? "interditada" : "restrita"}${aqui ? ", você está aqui" : ""}`}
        className={`flex flex-col items-center justify-center gap-0.5 border-[1.5px] border-tinta p-1 text-[10px] tracking-[.5px] ${className} ${sel === id ? "outline outline-[3px] -outline-offset-[5px] outline-verde" : ""}`}
        style={{ minHeight: altura, background: ok ? "var(--color-papel-claro)" : HACHURA, color: ok ? undefined : "#6b5f4e", borderStyle: a.secreta ? "dashed" : undefined }}>
        <b className="text-xs">{rotulo}</b>
        <span>nv {a.secreta && !ok ? "??" : dois(a.nivel)}{ok ? " ✓" : ""}</span>
        {aqui && <span className="bg-carimbo px-1 text-[#f4efe2]">VOCÊ ESTÁ AQUI</span>}
      </button>
    );
  };

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>V. ALAS — PLANTA DE ACESSO</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          O acesso a cada área é liberado conforme o nível do paciente. Áreas hachuradas permanecem restritas.
          A primeira entrada em cada área vale +{BONUS_PRIMEIRA_VISITA_ALA} XP.
        </p>
        <div className="flex items-center justify-between border-2 border-tinta px-3 py-2.5">
          <span className="text-[13px]">NÍVEL DE ACESSO</span>
          <span className="font-maquina text-[28px]">{dois(nivel)}</span>
        </div>
      </section>

      <section className="-mx-2 flex flex-col gap-2 border-2 border-tinta bg-[#f4ecd8] p-2.5">
        <div className="flex justify-between text-[11px] tracking-[.5px]"><span>PLANTA DE EVACUAÇÃO · BLOCO 1 · TÉRREO</span><span>N ↑</span></div>
        <div className="grid grid-cols-6 gap-1">
          {PLANTA.filter((c) => !c.abaixo).map((c) => sala({ id: c.id, className: COLUNAS[c.colunas], altura: c.altura }))}
        </div>
        <div className="text-center text-[10px] tracking-[1px]">▲ ENTRADA PRINCIPAL</div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 border-t-[1.5px] border-dashed border-tinta" />
          <span className="text-[10px]">ESCADA DE SERVIÇO ↓</span>
          <div className="flex-1 border-t-[1.5px] border-dashed border-tinta" />
        </div>
        <div className="grid grid-cols-6 gap-1">
          {PLANTA.filter((c) => c.abaixo).map((c) => sala({ id: c.id, className: COLUNAS[c.colunas], altura: c.altura }))}
        </div>
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
          const visitada = visitadasIds.includes(a.id);
          const aqui_ = alaAtualId === a.id;
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
                    {ok ? "LIBERADA" : a.secreta ? "NÃO CONSTA" : a.interditada ? "INTERDITADA" : "RESTRITA"}
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
                    <div className="flex flex-wrap gap-2">
                      {aqui_ ? (
                        <span className="btn cursor-default border-carimbo text-carimbo tracking-[1px]">● VOCÊ ESTÁ AQUI</span>
                      ) : (
                        <button type="button" className="btn btn-pri tracking-[1px]" disabled={ocupado} onClick={() => entrar(a)}>
                          {ocupado ? "DESLOCANDO…" : visitada ? "IR PARA ESTA ÁREA" : `IR PARA ESTA ÁREA (+${BONUS_PRIMEIRA_VISITA_ALA} XP)`}
                        </button>
                      )}
                      <Link href="/missoes" className="btn tracking-[1px]">VER MISSÕES →</Link>
                    </div>
                  ) : (
                    <p className="m-0 text-xs text-carimbo">
                      {a.secreta
                        ? "Este setor não existe. Solicitação registrada."
                        : a.interditada
                          ? "Área interditada pela coordenação."
                          : `Acesso a partir do nível ${dois(a.nivel)}. Seu nível: ${dois(nivel)}.`}
                    </p>
                  )}
                  {msg?.id === a.id && <p role="status" className={`m-0 text-xs ${msg.ok ? "text-verde" : "text-carimbo"}`}>{msg.texto}</p>}
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
