"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Anotacao, Titulo } from "@/components/ui";
import { dois } from "@/lib/regras";
import { aplicarAlas } from "./actions";

type Situacao = "liberada" | "interditada";
export type AlaConfig = { id: string; nome: string; sub: string; nivel: number; situacao: Situacao; secreta: boolean; pacientes: string };
type Config = { nivel: number; situacao: Situacao };

export function ControleAlas({ alas }: { alas: AlaConfig[] }) {
  const router = useRouter();
  const salvo: Record<string, Config> = Object.fromEntries(alas.map((a) => [a.id, { nivel: a.nivel, situacao: a.situacao }]));
  const [atual, setAtual] = useState(salvo);
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [ocupado, iniciar] = useTransition();

  const mudar = (id: string, o: Partial<Config>) => { setAtual((a) => ({ ...a, [id]: { ...a[id], ...o } })); setMsg(null); };
  const alterada = (id: string) => atual[id].nivel !== salvo[id].nivel || atual[id].situacao !== salvo[id].situacao;
  const mudadas = alas.filter((a) => !a.secreta && alterada(a.id));

  const aplicar = () =>
    iniciar(async () => {
      const r = await aplicarAlas(mudadas.map((a) => ({ id: a.id, ...atual[a.id] })));
      setMsg(r.ok ? { texto: r.msg, ok: true } : { texto: r.erro, ok: false });
      if (r.ok) router.refresh();
    });

  return (
    <>
      <section className="flex flex-col gap-1.5">
        <Titulo>CONTROLE DE ACESSO ÀS ALAS</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Defina o nível mínimo para cada ala ou interdite o acesso. Alterações valem para todos os pacientes.
        </p>
      </section>

      <div className="flex flex-col gap-3">
        {alas.map((a) => {
          const c = atual[a.id];
          const mudou = !a.secreta && alterada(a.id);
          return (
            <div key={a.id}
              className={`flex flex-col gap-2.5 border-[1.5px] border-tinta p-3 ${a.secreta ? "border-dashed bg-papel-escuro" : "bg-papel-claro"}`}
              style={mudou ? { boxShadow: "inset 4px 0 0 var(--color-ocre)" } : undefined}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-maquina text-[17px]">{a.nome}</span>
                  <span className="text-xs opacity-85">{a.sub}</span>
                </div>
                <span className="whitespace-nowrap text-[11px]">{a.pacientes} pac.</span>
              </div>
              {a.secreta ? (
                <p className="m-0 text-xs leading-snug text-carimbo">
                  Setor não consta na planta oficial. Configuração definida pela diretoria. Nível exigido: ██.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="rotulo flex-1">NÍVEL MÍNIMO</span>
                    <button type="button" className="btn h-11 w-11 p-0 text-lg" aria-label={`Diminuir nível de ${a.nome}`}
                      disabled={c.nivel <= 1 || ocupado} onClick={() => mudar(a.id, { nivel: c.nivel - 1 })}>−</button>
                    <b className="min-w-[30px] text-center font-maquina text-xl">{dois(c.nivel)}</b>
                    <button type="button" className="btn h-11 w-11 p-0 text-lg" aria-label={`Aumentar nível de ${a.nome}`}
                      disabled={ocupado} onClick={() => mudar(a.id, { nivel: c.nivel + 1 })}>+</button>
                  </div>
                  <div className="flex" role="group" aria-label={`Situação de ${a.nome}`}>
                    <button type="button" aria-pressed={c.situacao === "liberada"} disabled={ocupado} onClick={() => mudar(a.id, { situacao: "liberada" })}
                      className={`btn min-h-10 flex-1 text-[11px] ${c.situacao === "liberada" ? "btn-escuro" : ""}`}>LIBERADA POR NÍVEL</button>
                    <button type="button" aria-pressed={c.situacao === "interditada"} disabled={ocupado} onClick={() => mudar(a.id, { situacao: "interditada" })}
                      className={`btn min-h-10 flex-1 border-l-0 text-[11px] ${c.situacao === "interditada" ? "btn-perigo" : ""}`}>INTERDITADA</button>
                  </div>
                  {mudou && <span className="text-[11px] text-ocre">Alteração pendente</span>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {msg && <p role="status" className={`m-0 border border-dashed p-2 text-xs ${msg.ok ? "border-verde text-verde" : "border-carimbo text-carimbo"}`}>{msg.texto}</p>}

      <div className="flex gap-2">
        <button type="button" className="btn min-h-12 flex-1" disabled={!mudadas.length || ocupado} onClick={() => setAtual(salvo)}>DESCARTAR</button>
        <button type="button" className="btn btn-pri min-h-12 flex-[2]" disabled={!mudadas.length || ocupado} onClick={aplicar}>
          {ocupado ? "APLICANDO…" : `APLICAR (${mudadas.length})`}
        </button>
      </div>
      <Anotacao>Interditei a Ala C às 02:00. Às 03:17 estava liberada de novo.</Anotacao>
    </>
  );
}
