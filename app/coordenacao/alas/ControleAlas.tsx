"use client";

import { useState } from "react";
import { Anotacao, Titulo } from "@/components/ui";
import { alas } from "@/lib/mock";
import { dois } from "@/lib/regras";

type Config = { nivel: number; situacao: "liberada" | "interditada" };
const PACIENTES: Record<string, string> = { T: "4", A: "2", B: "1", K: "0", C: "2", P: "0", X: "?" };
const inicial = (): Record<string, Config> =>
  Object.fromEntries(alas.map((a) => [a.id, { nivel: a.nivel, situacao: a.id === "P" ? "interditada" : "liberada" }]));

export function ControleAlas() {
  const [salvo, setSalvo] = useState(inicial);
  const [atual, setAtual] = useState(inicial);
  const [msg, setMsg] = useState("");

  const mudar = (id: string, o: Partial<Config>) => { setAtual((a) => ({ ...a, [id]: { ...a[id], ...o } })); setMsg(""); };
  const alterada = (id: string) => atual[id].nivel !== salvo[id].nivel || atual[id].situacao !== salvo[id].situacao;
  const n = alas.filter((a) => !a.secreta && alterada(a.id)).length;

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
                  <span className="font-maquina text-[17px]">{a.secreta ? "ALA ██" : a.nome}</span>
                  <span className="text-xs opacity-85">{a.sub}</span>
                </div>
                <span className="whitespace-nowrap text-[11px]">{PACIENTES[a.id]} pac.</span>
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
                      disabled={c.nivel <= 1} onClick={() => mudar(a.id, { nivel: c.nivel - 1 })}>−</button>
                    <b className="min-w-[30px] text-center font-maquina text-xl">{dois(c.nivel)}</b>
                    <button type="button" className="btn h-11 w-11 p-0 text-lg" aria-label={`Aumentar nível de ${a.nome}`}
                      onClick={() => mudar(a.id, { nivel: c.nivel + 1 })}>+</button>
                  </div>
                  <div className="flex" role="group" aria-label={`Situação de ${a.nome}`}>
                    <button type="button" aria-pressed={c.situacao === "liberada"} onClick={() => mudar(a.id, { situacao: "liberada" })}
                      className={`btn min-h-10 flex-1 text-[11px] ${c.situacao === "liberada" ? "btn-escuro" : ""}`}>LIBERADA POR NÍVEL</button>
                    <button type="button" aria-pressed={c.situacao === "interditada"} onClick={() => mudar(a.id, { situacao: "interditada" })}
                      className={`btn min-h-10 flex-1 border-l-0 text-[11px] ${c.situacao === "interditada" ? "border-carimbo bg-carimbo text-[#f4efe2]" : ""}`}>INTERDITADA</button>
                  </div>
                  {mudou && <span className="text-[11px] text-ocre">Alteração pendente</span>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {msg && <p role="status" className="m-0 border border-dashed border-verde p-2 text-xs text-verde">{msg}</p>}

      <div className="flex gap-2">
        <button type="button" className="btn min-h-12 flex-1" disabled={n === 0} onClick={() => setAtual(salvo)}>DESCARTAR</button>
        <button type="button" className="btn btn-pri min-h-12 flex-[2]" disabled={n === 0}
          onClick={() => { setSalvo(atual); setMsg(`${n} alteração(ões) aplicada(s). Pacientes notificados na próxima avaliação.`); }}>
          APLICAR ({n})
        </button>
      </div>
      <Anotacao>Interditei a Ala C às 02:00. Às 03:17 estava liberada de novo.</Anotacao>
    </>
  );
}
