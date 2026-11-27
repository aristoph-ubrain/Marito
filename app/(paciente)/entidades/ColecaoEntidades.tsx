"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { DesenhoEntidade } from "@/components/Entidade";
import { Anotacao, Rodape, Titulo } from "@/components/ui";
import { CHANCE_LUA, ENTIDADES_ORIGINAIS, RARIDADES, type Raridade } from "@/lib/entidades-base";
import { dois } from "@/lib/regras";
import { escolherAcompanhante, invocarEntidade, invocarTodas, type ResultadoRitual } from "../actions";

export type EntidadeVista =
  | { id: string; tem: true; nome: string; raridade: Raridade; descricao: string; vezes: number }
  | { id: null; tem: false };

type Ritual =
  | { fase: "queimando"; todas?: number }
  | { fase: "pronto"; id: string; eco: boolean; nome: string; raridade: Raridade; descricao: string }
  | { fase: "todas"; resultado: Extract<ResultadoRitual, { ok: true }> };

/** Tempo do ritual antes de revelar (o resultado já veio do servidor; é só cena). */
const ESPERA_MS = 1800;

export function ColecaoEntidades({ lista, luas, acompanhante }: { lista: EntidadeVista[]; luas: number; acompanhante: string | null }) {
  const router = useRouter();
  const [ritual, setRitual] = useState<Ritual | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(espera.current), []);

  const total = ENTIDADES_ORIGINAIS.length;
  const tem = lista.filter((e) => e.tem).length;

  const invocar = () => {
    setErro("");
    setRitual({ fase: "queimando" });
    const inicio = Date.now();
    iniciar(async () => {
      const r = await invocarEntidade();
      if (!r.ok) {
        setRitual(null);
        setErro(r.erro);
        return;
      }
      clearTimeout(espera.current);
      espera.current = setTimeout(() => {
        setRitual({ fase: "pronto", id: r.id, eco: r.eco, nome: r.nome, raridade: r.raridade, descricao: r.descricao });
        router.refresh();
      }, Math.max(0, ESPERA_MS - (Date.now() - inicio)));
    });
  };

  const invocarTudo = () => {
    setErro("");
    setRitual({ fase: "queimando", todas: luas });
    const inicio = Date.now();
    iniciar(async () => {
      const r = await invocarTodas();
      if (!r.ok) {
        setRitual(null);
        setErro(r.erro);
        return;
      }
      clearTimeout(espera.current);
      espera.current = setTimeout(() => {
        setRitual({ fase: "todas", resultado: r });
        router.refresh();
      }, Math.max(0, ESPERA_MS + 600 - (Date.now() - inicio)));
    });
  };

  const acompanhar = (id: string | null) =>
    iniciar(async () => {
      const r = await escolherAcompanhante(id);
      if (!r.ok) setErro(r.erro);
      router.refresh();
    });

  const queimando = ritual?.fase === "queimando";

  return (
    <>
      <section className="flex flex-col gap-2">
        <Titulo>X. ENTIDADES</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Algumas ordens deixam para trás uma <b>Lua Negra</b>. Queimada no Dormitório à meia-luz, ela chama uma entidade. A que você
          escolher acompanha a sua ficha.
        </p>
      </section>

      <div className="flex items-center gap-3.5 border-2 border-tinta p-3">
        <span aria-hidden="true" className="h-16 w-16 flex-none rounded-full"
          style={{ background: "radial-gradient(circle at 38% 36%,#3a3440 0 30%,#141018 70%)", boxShadow: "0 0 0 3px var(--color-papel),0 0 0 4.5px var(--color-tinta),0 0 18px rgba(40,20,60,.55)" }} />
        <div className="flex flex-1 flex-col gap-1">
          <span className="font-maquina text-base">LUA NEGRA ×{luas}</span>
          <span className="text-[11px] leading-snug opacity-85">
            Achada entre os papéis das ordens ({CHANCE_LUA * 100}% por ordem concluída, em qualquer área). Cada lua invoca uma entidade.
          </span>
        </div>
      </div>
      <button type="button" className="btn btn-escuro min-h-[52px] text-sm tracking-[1.5px]" disabled={luas < 1 || ocupado || queimando} onClick={invocar}>
        {queimando ? "INVOCANDO…" : luas > 0 ? "QUEIMAR A LUA NEGRA" : "NENHUMA LUA NEGRA"}
      </button>
      {luas > 1 && (
        <button type="button" className="btn min-h-11 tracking-[1px]" disabled={ocupado || queimando} onClick={invocarTudo}>
          QUEIMAR TODAS ({luas})
        </button>
      )}
      {erro && <p role="alert" className="m-0 text-xs text-carimbo">{erro}</p>}

      {ritual && (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-2.5 border-2 border-tinta bg-[#1c1714] p-4 text-center text-papel">
          <span className="text-[11px] tracking-[1.5px] opacity-80">
            {ritual.fase === "queimando"
              ? ritual.todas
                ? `${ritual.todas} LUAS ESTÃO APAGANDO…`
                : "A LUA ESTÁ APAGANDO…"
              : ritual.fase === "todas"
                ? `RITUAL DE ${ritual.resultado.queimadas} LUAS`
                : ritual.eco
                  ? "ECO · ELA JÁ ESTAVA AQUI"
                  : "ENTIDADE INVOCADA"}
          </span>
          {ritual.fase === "todas" ? (
            <>
              <ul className="m-0 grid w-full list-none grid-cols-3 gap-2 p-0">
                {ritual.resultado.resultados.map((x) => (
                  <li key={x.id} className="anim-revela relative flex flex-col items-center gap-1 border border-papel/40 px-1 py-1.5 text-[10px] leading-tight">
                    {x.nova && <span className="absolute -top-2 left-1 bg-papel px-1 text-[8.5px] tracking-[1px] text-verde">NOVA</span>}
                    {x.vezes > 1 && <span className="absolute top-0.5 right-1 text-[9px]">×{x.vezes}</span>}
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4efe2]"><DesenhoEntidade id={x.id} tamanho={42} /></span>
                    <span>{x.nome}</span>
                    <span className="text-[8.5px] tracking-[1px]" style={{ color: RARIDADES[x.raridade].cor, filter: "brightness(1.8)" }}>{RARIDADES[x.raridade].rotulo}</span>
                  </li>
                ))}
              </ul>
              <span className="text-xs opacity-90">
                {ritual.resultado.resultados.filter((x) => x.nova).length
                  ? `${ritual.resultado.resultados.filter((x) => x.nova).length} nova(s) na coleção. O resto virou eco.`
                  : "Nenhuma nova. Todas já estavam aqui."}
              </span>
              <button type="button" className="btn w-full border-papel text-papel" onClick={() => setRitual(null)}>GUARDAR</button>
            </>
          ) : (
          <>
          <div className="flex h-[150px] w-[150px] items-center justify-center rounded-full border-[1.5px] border-dashed border-papel/60 motion-safe:animate-[spin_6s_linear_infinite]">
            {ritual.fase === "queimando" ? (
              <span className="h-[52px] w-[52px] rounded-full border-[1.5px] border-papel bg-[#141018]" />
            ) : (
              <span className="flex motion-safe:animate-[spin_6s_linear_infinite_reverse]">
                <DesenhoEntidade id={ritual.id} tamanho={96} className="anim-revela" />
              </span>
            )}
          </div>
          {ritual.fase === "pronto" ? (
            <>
              <b className="font-maquina text-[17px] font-normal">{ritual.nome}</b>
              <span className="bg-papel px-1.5 text-[10px] tracking-[1.5px]" style={{ color: RARIDADES[ritual.raridade].cor }}>{RARIDADES[ritual.raridade].rotulo}</span>
              <span className="text-xs leading-snug opacity-90">{ritual.descricao}</span>
              <div className="flex w-full gap-2">
                <button type="button" className="btn flex-1 border-papel text-papel" onClick={() => setRitual(null)}>GUARDAR</button>
                <button type="button" className="btn flex-1 border-papel bg-papel text-tinta" disabled={ocupado}
                  onClick={() => { const id = ritual.id; setRitual(null); acompanhar(id); }}>QUE ME ACOMPANHE</button>
              </div>
            </>
          ) : (
            <span className="text-xs opacity-90">Não desvie o olhar.</span>
          )}
          </>
          )}
        </div>
      )}


      {(() => {
        const atual = lista.find((e): e is Extract<EntidadeVista, { tem: true }> => e.tem && e.id === acompanhante);
        return (
          <section aria-label="Acompanhante atual"
            className={`relative flex items-center gap-3 border-2 p-3 ${atual ? "border-verde bg-verde/[.07]" : "border-dashed border-tinta"}`}>
            <span className={`flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full border-2 bg-[#f4efe2] ${atual ? "border-verde" : "border-dashed border-tinta"}`}>
              <DesenhoEntidade id={atual?.id} tamanho={60} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[10px] tracking-[1.5px] text-verde">{atual ? "ESTÁ TE SEGUINDO" : "NINGUÉM TE SEGUE"}</span>
              <b className="font-maquina text-[17px] font-normal leading-tight">{atual ? atual.nome : "Nenhuma entidade"}</b>
              <span className="text-[11px] leading-snug opacity-80">
                {atual ? `${RARIDADES[atual.raridade].rotulo} · ×${atual.vezes} · aparece na sua ficha e no convívio` : "Toque numa entidade da coleção para ela te seguir."}
              </span>
            </span>
            {atual && (
              <button type="button" className="btn min-h-9 self-start px-2 text-[11px]" disabled={ocupado} onClick={() => acompanhar(null)}>DISPENSAR</button>
            )}
          </section>
        );
      })()}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs tracking-[.5px]"><b>COLEÇÃO</b></span>
          <span className="font-maquina text-base">{dois(tem)} / {dois(total)}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Entidades">
          {lista.map((e, i) =>
            e.tem ? (
              <button key={e.id} type="button" aria-pressed={acompanhante === e.id} disabled={ocupado}
                aria-label={`${e.nome}, ${RARIDADES[e.raridade].rotulo}${acompanhante === e.id ? ", acompanhando" : ""}`}
                onClick={() => acompanhar(acompanhante === e.id ? null : e.id)}
                className={`relative flex min-h-[118px] cursor-pointer flex-col items-center gap-1 border-[1.5px] border-tinta bg-papel-claro px-1 pt-1.5 pb-1 text-center font-mono text-[10px] leading-tight text-tinta ${acompanhante === e.id ? "border-verde bg-verde/[.12] outline-[3px] outline-offset-1 outline-verde outline-solid" : ""}`}>
                {acompanhante === e.id && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-verde px-1.5 text-[8.5px] tracking-[1px] whitespace-nowrap text-papel">TE SEGUE</span>
                )}
                {e.vezes > 1 && <span className="absolute top-0.5 right-1 text-[9px]">×{e.vezes}</span>}
                <DesenhoEntidade id={e.id} tamanho={52} />
                <span>{e.nome}</span>
                <span className="text-[8.5px] tracking-[1px]" style={{ color: RARIDADES[e.raridade].cor }}>{RARIDADES[e.raridade].rotulo}</span>
              </button>
            ) : (
              <div key={`f${i}`} aria-label="Entidade não invocada"
                className="flex min-h-[118px] flex-col items-center gap-1 border-[1.5px] border-dashed border-tinta px-1 pt-1.5 text-center text-[10px] opacity-60">
                <DesenhoEntidade tamanho={52} />
                <span>???</span>
              </div>
            ),
          )}
        </div>
        <p className="m-0 text-[11px] leading-snug opacity-75">
          Toque numa entidade para ela te seguir (toque de novo para dispensar). Repetidas viram ecos (×2, ×3): só contam.
          Entidades são coleção: não mudam XP nem missões. Chance por lua: cada comum 20% · cada incomum 14% · cada rara 5% · lendária 1%.
        </p>
      </section>

      <Anotacao>eu não invoquei o gato. ele só estava lá quando a lua apagou.</Anotacao>
      <Rodape>Objetos encontrados nas atividades devem ser entregues à enfermaria. A equipe não reconhece a existência de entidades.</Rodape>
    </>
  );
}
