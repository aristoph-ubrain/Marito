"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Anotacao, Titulo } from "@/components/ui";
import { dois, milhar, xpParaProximoNivel } from "@/lib/regras";
import { anotar, salvarDiagnostico } from "./actions";

export type PacienteResumo = {
  id: string;
  nome: string;
  nivel: number;
  ala: string;
  xp: number;
  pontos: number;
  diagnostico: string;
  notas: string[];
};

export function GestaoPacientes({ pacientes }: { pacientes: PacienteResumo[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [nota, setNota] = useState("");
  const [diag, setDiag] = useState("");
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [ocupado, iniciar] = useTransition();

  const q = busca.trim().toLowerCase();
  const lista = pacientes.filter((p) => !q || p.id.includes(q) || p.nome.toLowerCase().includes(q));
  const mostrarFantasma = !q || "0112".includes(q);

  const abrir = (p: PacienteResumo | null, id: string) => {
    const fechar = sel === id;
    setSel(fechar ? null : id);
    setMsg(null);
    setNota("");
    setDiag(p?.diagnostico ?? "");
  };

  const executar = (acao: () => Promise<{ ok: true; msg: string } | { ok: false; erro: string }>, depois?: () => void) =>
    iniciar(async () => {
      const r = await acao();
      setMsg(r.ok ? { texto: r.msg, ok: true } : { texto: r.erro, ok: false });
      if (r.ok) {
        depois?.();
        router.refresh();
      }
    });

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>PACIENTES INTERNADOS</Titulo>
        <div className="flex justify-between text-xs">
          <span>Registrados: <b>{dois(pacientes.length)}</b></span>
          <span>Listados: <b>{dois(lista.length + (mostrarFantasma ? 1 : 0))}</b></span>
        </div>
        <label htmlFor="busca" className="rotulo">BUSCAR POR Nº OU NOME</label>
        <input id="busca" className="campo" placeholder="0108 ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </section>

      <div className="flex flex-col gap-2">
        {lista.length === 0 && !mostrarFantasma && <p className="m-0 text-xs opacity-70">Nenhum paciente encontrado.</p>}
        {lista.map((p) => {
          const aberto = sel === p.id;
          return (
            <div key={p.id} className="flex flex-col">
              <button type="button" aria-expanded={aberto} onClick={() => abrir(p, p.id)}
                className={`flex min-h-14 w-full items-center gap-2.5 border-[1.5px] border-tinta px-3 py-2.5 text-left ${aberto ? "bg-tinta text-papel" : "bg-papel-claro"}`}>
                <b className="min-w-11 font-maquina text-base font-normal">{p.id}</b>
                <span className="flex flex-1 flex-col">
                  <span className="text-sm">{p.nome}</span>
                  <span className="text-[11px] opacity-80">Nv. {dois(p.nivel)} · {p.ala}</span>
                </span>
                <span aria-hidden="true">{aberto ? "▾" : "▸"}</span>
              </button>

              {aberto && (
                <div className="flex flex-col gap-3 border-[1.5px] border-t-0 border-tinta bg-papel-campo p-3">
                  <div className="grid grid-cols-3 border-[1.5px] border-tinta text-center">
                    <div className="border-r border-tinta px-0.5 py-1.5"><span className="rotulo">NÍVEL</span><br /><b className="text-lg">{dois(p.nivel)}</b></div>
                    <div className="border-r border-tinta px-0.5 py-1.5"><span className="rotulo">XP NO NÍVEL</span><br />
                      <b className="text-[13px]">{milhar(p.xp)} / {milhar(xpParaProximoNivel(p.nivel))}</b></div>
                    <div className="px-0.5 py-1.5"><span className="rotulo">PONTOS</span><br /><b className="text-lg">{p.pontos}</b></div>
                  </div>
                  <p className="m-0 text-[11px] leading-snug opacity-75">
                    XP e pontos vêm apenas das regras do jogo: missões, acesso diário e primeira visita a uma ala.
                  </p>
                  <div className="flex flex-col gap-2 border-[1.5px] border-tinta p-2.5">
                    <label htmlFor="diag" className="rotulo">DIAGNÓSTICO</label>
                    <input id="diag" className="campo" maxLength={200} value={diag} onChange={(e) => setDiag(e.target.value)} />
                    <button type="button" className="btn" disabled={ocupado || diag.trim() === p.diagnostico}
                      onClick={() => executar(() => salvarDiagnostico(p.id, diag))}>SALVAR DIAGNÓSTICO</button>
                  </div>
                  <div className="flex flex-col gap-2 border-[1.5px] border-tinta p-2.5">
                    <label htmlFor="nota" className="rotulo">NOVA ANOTAÇÃO DA EQUIPE</label>
                    <textarea id="nota" className="campo bg-white" rows={3} maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)} />
                    <button type="button" className="btn btn-pri" disabled={ocupado || !nota.trim()}
                      onClick={() => executar(() => anotar(p.id, nota), () => setNota(""))}>REGISTRAR ANOTAÇÃO</button>
                    {p.notas.map((n, i) => <div key={i} className="border-t border-dashed border-tinta pt-1.5 text-xs leading-snug">{n}</div>)}
                  </div>
                  {msg && <p role="status" className={`m-0 text-xs ${msg.ok ? "text-verde" : "text-carimbo"}`}>{msg.texto}</p>}
                </div>
              )}
            </div>
          );
        })}

        {mostrarFantasma && (
          <div className="flex flex-col">
            <button type="button" aria-expanded={sel === "0112"} onClick={() => abrir(null, "0112")}
              className={`flex min-h-14 w-full items-center gap-2.5 border-[1.5px] border-dashed border-tinta px-3 py-2.5 text-left ${sel === "0112" ? "bg-tinta text-papel" : "bg-papel-escuro"}`}>
              <b className="min-w-11 font-maquina text-base font-normal">0112</b>
              <span className="flex flex-1 flex-col">
                <span className="text-sm">████████</span>
                <span className="text-[11px] opacity-80">Nv. ?? · ALA C · Q. 112</span>
              </span>
              <span aria-hidden="true">{sel === "0112" ? "▾" : "▸"}</span>
            </button>
            {sel === "0112" && (
              <div className="border-[1.5px] border-t-0 border-dashed border-tinta bg-papel-campo p-3 text-[13px] leading-snug text-carimbo">
                Prontuário sem internação registrada. Edição bloqueada. Último acesso: hoje, 03:17.
              </div>
            )}
          </div>
        )}
      </div>
      <Anotacao>{dois(pacientes.length)} registrados. Por que a lista mostra {dois(pacientes.length + 1)}?</Anotacao>
    </>
  );
}
