"use client";

import Link from "next/link";
import { useState } from "react";
import { Anotacao, Titulo } from "@/components/ui";
import { dois, milhar, xpParaProximoNivel } from "@/lib/regras";

type Paciente = { id: string; nome: string; nivel: number | null; ala: string; xp: number; pontos: number; diagnostico: string; notas: string[]; bloqueado?: boolean };

const INICIAIS: Paciente[] = [
  { id: "0077", nome: "Iara Menezes", nivel: 7, ala: "ALA C", xp: 5320, pontos: 0, diagnostico: "CID F44 (Transtorno dissociativo)", notas: ["22/11 · Primeira na Ala C após a reabertura."] },
  { id: "0094", nome: "Helena Duarte", nivel: 5, ala: "ALA B", xp: 3110, pontos: 1, diagnostico: "CID F42 (TOC)", notas: ["23/11 · Reconhece etiquetas que não escreveu."] },
  { id: "0108", nome: "Aristoph Ubrain", nivel: 3, ala: "ALA A", xp: 1240, pontos: 3, diagnostico: "CID F20 (Esquizofrenia)", notas: ["24/11 · Conversou 40 min com o quarto vazio.", "20/11 · Reclassificado como ANÔMALO."] },
  { id: "0121", nome: "Tomás Ferraz", nivel: 2, ala: "ALA A", xp: 610, pontos: 0, diagnostico: "CID F41 (Ansiedade)", notas: ["25/11 · Dorme de luz acesa."] },
  { id: "0112", nome: "████████", nivel: null, ala: "ALA C · Q. 112", xp: 0, pontos: 0, diagnostico: "", notas: [], bloqueado: true },
];

export function GestaoPacientes() {
  const [pacientes, setPacientes] = useState(INICIAIS);
  const [sel, setSel] = useState<string | null>("0108");
  const [busca, setBusca] = useState("");
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState("");

  const atualizar = (id: string, o: Partial<Paciente>) => setPacientes((ps) => ps.map((p) => (p.id === id ? { ...p, ...o } : p)));

  const q = busca.trim().toLowerCase();
  const lista = pacientes.filter((p) => !q || p.id.includes(q) || p.nome.toLowerCase().includes(q));

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>PACIENTES INTERNADOS</Titulo>
        <div className="flex justify-between text-xs"><span>Registrados: <b>04</b></span><span>Listados: <b>{dois(lista.length)}</b></span></div>
        <label htmlFor="busca" className="rotulo">BUSCAR POR Nº OU NOME</label>
        <input id="busca" className="campo" placeholder="0108 ou Aristoph" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </section>

      <div className="flex flex-col gap-2">
        {lista.map((p) => {
          const aberto = sel === p.id;
          return (
            <div key={p.id} className="flex flex-col">
              <button type="button" aria-expanded={aberto} onClick={() => { setSel(aberto ? null : p.id); setMsg(""); setNota(""); }}
                className={`flex min-h-14 w-full items-center gap-2.5 border-[1.5px] border-tinta px-3 py-2.5 text-left ${aberto ? "bg-tinta text-papel" : "bg-papel-claro"}`}>
                <b className="min-w-11 font-maquina text-base font-normal">{p.id}</b>
                <span className="flex flex-1 flex-col">
                  <span className="text-sm">{p.nome}</span>
                  <span className="text-[11px] opacity-80">Nv. {p.nivel ? dois(p.nivel) : "??"} · {p.ala}</span>
                </span>
                <span aria-hidden="true">{aberto ? "▾" : "▸"}</span>
              </button>

              {aberto && (
                <div className="flex flex-col gap-3 border-[1.5px] border-t-0 border-tinta bg-papel-campo p-3">
                  {p.bloqueado ? (
                    <p className="m-0 text-[13px] leading-snug text-carimbo">
                      Prontuário sem internação registrada. Edição bloqueada. Último acesso: hoje, 03:17.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 border-[1.5px] border-tinta text-center">
                        <div className="border-r border-tinta px-0.5 py-1.5"><span className="rotulo">NÍVEL</span><br /><b className="text-lg">{dois(p.nivel!)}</b></div>
                        <div className="border-r border-tinta px-0.5 py-1.5"><span className="rotulo">XP NO NÍVEL</span><br />
                          <b className="text-[13px]">{milhar(p.xp)} / {milhar(xpParaProximoNivel(p.nivel!))}</b></div>
                        <div className="px-0.5 py-1.5"><span className="rotulo">PONTOS</span><br /><b className="text-lg">{p.pontos}</b></div>
                      </div>
                      <p className="m-0 text-[11px] leading-snug opacity-75">
                        XP e pontos vêm apenas das regras do jogo: missões, acesso diário e primeira visita a uma ala.
                      </p>
                      <div className="flex flex-col gap-2 border-[1.5px] border-tinta p-2.5">
                        <label htmlFor="diag" className="rotulo">DIAGNÓSTICO</label>
                        <input id="diag" className="campo" value={p.diagnostico} onChange={(e) => atualizar(p.id, { diagnostico: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-2 border-[1.5px] border-tinta p-2.5">
                        <label htmlFor="nota" className="rotulo">NOVA ANOTAÇÃO DA EQUIPE</label>
                        <textarea id="nota" className="campo bg-white" rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
                        <button type="button" className="btn btn-pri" onClick={() => {
                          if (!nota.trim()) return;
                          atualizar(p.id, { notas: [`25/11 · ${nota.trim()}`, ...p.notas] });
                          setNota("");
                          setMsg("Anotação registrada na ficha.");
                        }}>REGISTRAR ANOTAÇÃO</button>
                        {p.notas.map((n) => <div key={n} className="border-t border-dashed border-tinta pt-1.5 text-xs leading-snug">{n}</div>)}
                      </div>
                      {msg && <p role="status" className="m-0 text-xs text-verde">{msg}</p>}
                      <Link href="/ficha" className="btn">VER FICHA COMPLETA →</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Anotacao>04 registrados. Por que a lista mostra 05?</Anotacao>
    </>
  );
}
