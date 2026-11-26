"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Anotacao, GradeAtributos, Titulo } from "@/components/ui";
import { ATRIBUTOS } from "@/lib/atributos";
import { dois, milhar, xpParaProximoNivel } from "@/lib/regras";
import type { DiaVisto } from "@/lib/livro";
import { anotar, historicoDoPaciente, reclassificar, salvarDiagnostico } from "./actions";

const ETIQUETA: Record<string, { rotulo: string; cor: string }> = {
  ev: { rotulo: "EVOLUÇÃO", cor: "var(--color-verde)" },
  os: { rotulo: "ATIVIDADE", cor: "var(--color-tinta)" },
  ac: { rotulo: "ACESSO", cor: "var(--color-ocre)" },
  cv: { rotulo: "CONVÍVIO", cor: "var(--color-caneta)" },
  eq: { rotulo: "EQUIPE", cor: "var(--color-carimbo)" },
};

export type PacienteResumo = {
  id: string;
  nome: string;
  nivel: number;
  ala: string;
  xp: number;
  pontos: number;
  atributos: { sigla: string; nome: string; valor: number }[];
  diagnostico: string;
  classe: string;
  classeDesde: string | null;
  relato: string;
  notas: string[];
};

export function GestaoPacientes({ pacientes, classes }: { pacientes: PacienteResumo[]; classes: { nome: string; cor: string }[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [nota, setNota] = useState("");
  const [diag, setDiag] = useState("");
  const [novaClasse, setNovaClasse] = useState("");
  const [motivo, setMotivo] = useState("");
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const [livro, setLivro] = useState<{ id: string; dias: DiaVisto[] | null; erro?: string } | null>(null);
  const [lendo, iniciarLeitura] = useTransition();

  const abrirHistorico = (id: string) => {
    if (livro?.id === id) return setLivro(null);
    setLivro({ id, dias: null });
    iniciarLeitura(async () => {
      const r = await historicoDoPaciente(id);
      setLivro(r.ok ? { id, dias: r.dias } : { id, dias: [], erro: r.erro });
    });
  };

  const corDe = (nome: string) => classes.find((c) => c.nome === nome)?.cor ?? "var(--color-tinta)";
  const q = busca.trim().toLowerCase();
  const lista = pacientes.filter((p) => !q || p.id.includes(q) || p.nome.toLowerCase().includes(q));
  const mostrarFantasma = !q || "0112".includes(q);

  const abrir = (p: PacienteResumo | null, id: string) => {
    const fechar = sel === id;
    setSel(fechar ? null : id);
    setMsg(null);
    setNota("");
    setDiag(p?.diagnostico ?? "");
    setNovaClasse(p?.classe ?? "");
    setMotivo("");
    setLivro(null);
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
                  <div className="flex flex-col gap-1.5" role="group" aria-label={`Atributos de ${p.nome}`}>
                    <span className="rotulo">ATRIBUTOS · TOTAL {p.atributos.reduce((s, a) => s + a.valor, 0)}</span>
                    <GradeAtributos itens={p.atributos} />
                    <span className="text-[11px] opacity-75">{p.pontos > 0 ? `${p.pontos} ponto${p.pontos > 1 ? "s" : ""} ainda não distribuído${p.pontos > 1 ? "s" : ""}.` : "Todos os pontos distribuídos."}</span>
                  </div>
                  <details className="border-[1.5px] border-tinta p-2.5">
                    <summary className="rotulo cursor-pointer">RELATO DE ENTRADA</summary>
                    <p className="m-0 mt-2 text-[13px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">
                      {p.relato.trim() || "Não consta relato na internação."}
                    </p>
                  </details>
                  <p className="m-0 text-[11px] leading-snug opacity-75">
                    XP e pontos vêm apenas das regras do jogo: missões, acesso diário e primeira visita a uma ala.
                  </p>
                  <div className="flex flex-col gap-2 border-[1.5px] border-tinta p-2.5">
                    <span className="rotulo">CLASSIFICAÇÃO</span>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="border-[2.5px] px-2 py-0.5 font-maquina text-sm tracking-[2px]"
                        style={{ borderColor: corDe(p.classe), color: corDe(p.classe), transform: "rotate(-3deg)" }}>{p.classe}</span>
                      <span className="text-[11px] opacity-80">{p.classeDesde ? `desde ${p.classeDesde}` : "desde a internação"}</span>
                    </div>
                    <label htmlFor="ncl" className="rotulo">RECLASSIFICAR COMO</label>
                    <select id="ncl" className="campo" value={novaClasse} onChange={(e) => setNovaClasse(e.target.value)}>
                      {!classes.some((c) => c.nome === p.classe) && <option value={p.classe}>{p.classe}</option>}
                      {classes.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                    </select>
                    <label htmlFor="mot" className="rotulo">MOTIVO (APARECE NO AVISO DO PACIENTE)</label>
                    <input id="mot" className="campo" maxLength={120} placeholder="Ex.: responde a chamados que ninguém fez" value={motivo}
                      onChange={(e) => setMotivo(e.target.value)} />
                    <button type="button" className="btn btn-pri" disabled={ocupado || novaClasse === p.classe}
                      onClick={() => executar(() => reclassificar(p.id, novaClasse, motivo), () => setMotivo(""))}>RECLASSIFICAR</button>
                    <span className="text-[11px] opacity-75">Classes e carimbos são editados em <Link href="/coordenacao/classes">CLASSES</Link>.</span>
                  </div>
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
                  <div className="flex flex-col gap-2 border-[1.5px] border-tinta p-2.5">
                    <button type="button" className="btn justify-between" aria-expanded={livro?.id === p.id} onClick={() => abrirHistorico(p.id)}>
                      <span>HISTÓRICO DO PACIENTE</span><span aria-hidden="true">{livro?.id === p.id ? "▾" : "▸"}</span>
                    </button>
                    {livro?.id === p.id && (
                      <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1" aria-busy={lendo}>
                        {lendo || !livro.dias ? (
                          <p className="m-0 text-xs opacity-70">Abrindo o livro de ocorrências…</p>
                        ) : livro.erro ? (
                          <p role="alert" className="m-0 text-xs text-carimbo">{livro.erro}</p>
                        ) : livro.dias.length === 0 ? (
                          <p className="m-0 text-xs opacity-70">Nenhum lançamento registrado.</p>
                        ) : (
                          livro.dias.map((d) => (
                            <div key={d.chave} className="flex flex-col gap-1">
                              <b className="font-maquina text-sm font-normal">{d.data}</b>
                              <ol className="m-0 flex list-none flex-col gap-1.5 border-l-2 border-tinta p-0 pl-2.5">
                                {d.registros.map((r, i) => (
                                  <li key={i} className="flex flex-col gap-0.5 text-xs leading-snug">
                                    <span className="flex items-center gap-1.5">
                                      <b>{r.hora}</b>
                                      <span className="border px-1 text-[10px]" style={{ borderColor: ETIQUETA[r.tipo]?.cor, color: ETIQUETA[r.tipo]?.cor }}>{ETIQUETA[r.tipo]?.rotulo ?? r.tipo}</span>
                                      <span className="opacity-70">{r.codigo}</span>
                                      {r.vezes && r.vezes > 1 && <span className="ml-auto border border-tinta px-1 font-maquina text-[10px]">×{r.vezes}</span>}
                                    </span>
                                    <span>{r.texto}{r.xp && <b className="text-verde"> {r.xp}</b>}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ))
                        )}
                      </div>
                    )}
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
                <p className="m-0">Prontuário sem internação registrada. Edição bloqueada. Último acesso: hoje, 03:17.</p>
                <div className="mt-2.5 flex flex-col gap-1.5 text-tinta">
                  <span className="rotulo">ATRIBUTOS</span>
                  <GradeAtributos itens={ATRIBUTOS.map((a) => ({ sigla: a.sigla, valor: "??" }))} />
                  <span className="rotulo mt-1">RELATO DE ENTRADA</span>
                  <p className="m-0 text-[13px] leading-relaxed">
                    Eu não pedi para entrar. <span className="censura">Já estava aqui</span> quando construíram a ala.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Anotacao>{dois(pacientes.length)} registrados. Por que a lista mostra {dois(pacientes.length + 1)}?</Anotacao>
    </>
  );
}
