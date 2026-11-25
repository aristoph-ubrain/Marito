"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ATRIBUTOS, siglaDe, type ChaveAtributo } from "@/lib/atributos";
import { dois, duracaoTexto, DURACOES_MISSAO } from "@/lib/regras";
import { salvarOrdem } from "../actions";

const ALAS = ["TÉRREO", "ALA A", "ALA B", "CONSULTÓRIOS", "ALA C", "CAPELA"];

type Req = { atributo: ChaveAtributo; minimo: number };
export type OrdemInicial = {
  codigo: string;
  titulo: string;
  ala: string;
  descricao: string;
  requisitos: Req[];
  xp: number;
  duracao: number;
  publicada: boolean;
  protegida: boolean;
};

export function EditorOrdem({ inicial }: { inicial: OrdemInicial | null }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [ala, setAla] = useState(inicial?.ala ?? ALAS[0]);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [reqs, setReqs] = useState<Req[]>(inicial?.requisitos ?? [{ atributo: "FOR", minimo: 1 }]);
  const [xp, setXp] = useState(inicial?.xp ?? 50);
  const [duracao, setDuracao] = useState(inicial?.duracao ?? 20);
  const [salvando, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const bloqueada = !!inicial?.protegida;
  const opcoesDuracao = [...new Set([...DURACOES_MISSAO, duracao])].sort((a, b) => a - b);

  const mudarReq = (i: number, o: Partial<Req>) => {
    setReqs((r) => r.map((x, j) => (j === i ? { ...x, ...o } : x)));
    setMsg(null);
  };

  const salvar = (publicar: boolean) => {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarOrdem({ titulo, ala, descricao, requisitos: reqs, xp, duracao }, publicar, inicial?.codigo);
      if (!r.ok) return setMsg({ texto: r.erro, ok: false });
      router.push("/coordenacao/missoes");
      router.refresh();
    });
  };

  const corSit = inicial?.publicada ? "var(--color-verde)" : "var(--color-ocre)";

  return (
    <>
      <Link href="/coordenacao/missoes" className="text-xs">← Voltar às ordens</Link>
      <div className="flex items-end justify-between border-b border-tinta pb-2">
        <div className="flex flex-col gap-0.5">
          <span className="rotulo">{inicial ? "EDIÇÃO DE ORDEM" : "NOVA ORDEM"}</span>
          <span className="font-maquina text-2xl leading-none">{inicial?.codigo ?? "OS-···"}</span>
        </div>
        <span className="border-2 px-1.5 py-0.5 text-[11px] tracking-[1px]" style={{ borderColor: corSit, color: corSit }}>
          {inicial ? (inicial.publicada ? "PUBLICADA" : "RASCUNHO") : "NÃO SALVA"}
        </span>
      </div>

      {bloqueada && (
        <p role="alert" className="m-0 border border-dashed border-carimbo p-2 text-xs text-carimbo">
          Ordem protegida. Edição bloqueada. Responsável não identificado.
        </p>
      )}

      <fieldset disabled={bloqueada || salvando} className="m-0 flex flex-col gap-5 border-0 p-0">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="titulo" className="rotulo">TÍTULO</label>
          <input id="titulo" className="campo" maxLength={80} value={titulo} onChange={(e) => { setTitulo(e.target.value); setMsg(null); }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ala" className="rotulo">ALA</label>
          <select id="ala" className="campo" value={ala} onChange={(e) => setAla(e.target.value)}>
            {ALAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="descricao" className="rotulo">DESCRIÇÃO (visível ao paciente)</label>
          <textarea id="descricao" className="campo" rows={3} maxLength={500} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-[1.5px] border-tinta p-2.5">
          <legend className="rotulo px-1">REQUISITOS DE ATRIBUTO</legend>
          {reqs.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <select aria-label="Atributo" className="campo min-w-0 flex-1 px-1.5" value={r.atributo}
                onChange={(e) => mudarReq(i, { atributo: e.target.value as ChaveAtributo })}>
                {ATRIBUTOS.map((a) => <option key={a.chave} value={a.chave}>{a.sigla} · {a.nome}</option>)}
              </select>
              <button type="button" className="btn h-11 w-11 p-0 text-lg" aria-label="Diminuir" onClick={() => mudarReq(i, { minimo: Math.max(1, r.minimo - 1) })}>−</button>
              <b className="min-w-[26px] text-center font-maquina text-lg">{dois(r.minimo)}</b>
              <button type="button" className="btn h-11 w-11 p-0 text-lg" aria-label="Aumentar" onClick={() => mudarReq(i, { minimo: r.minimo + 1 })}>+</button>
              <button type="button" className="btn h-11 w-11 border-dashed p-0" aria-label="Remover requisito"
                onClick={() => setReqs((x) => x.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn border-dashed" disabled={reqs.length >= 4}
            onClick={() => {
              const usados = reqs.map((r) => r.atributo);
              const livre = ATRIBUTOS.find((a) => !usados.includes(a.chave))?.chave ?? "FOR";
              setReqs((x) => [...x, { atributo: livre, minimo: 1 }]);
            }}>
            + ADICIONAR REQUISITO
          </button>
        </fieldset>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <span className="rotulo">RECOMPENSA (XP)</span>
            <div className="flex items-center gap-1">
              <button type="button" className="btn h-11 w-11 p-0 text-lg" aria-label="Menos XP" onClick={() => setXp((x) => Math.max(0, x - 10))}>−</button>
              <b className="flex-1 text-center font-maquina text-lg">{xp}</b>
              <button type="button" className="btn h-11 w-11 p-0 text-lg" aria-label="Mais XP" onClick={() => setXp((x) => x + 10)}>+</button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="duracao" className="rotulo">DURAÇÃO</label>
            <select id="duracao" className="campo" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))}>
              {opcoesDuracao.map((d) => <option key={d} value={d}>{duracaoTexto(d)}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span className="rotulo">PRÉ-VISUALIZAÇÃO · COMO O PACIENTE VÊ</span>
        <div className="flex flex-col gap-1.5 border-[1.5px] border-tinta bg-papel-claro p-3 shadow-[3px_3px_0_rgba(43,38,32,.25)]">
          <div className="flex justify-between border-b border-dashed border-tinta pb-1 text-[11px]"><span>{inicial?.codigo ?? "OS-···"}</span><span>{ala}</span></div>
          <b className="font-maquina text-base font-normal">{titulo || "(sem título)"}</b>
          {descricao && <p className="m-0 text-xs leading-snug opacity-90">{descricao}</p>}
          <div className="flex flex-wrap gap-1.5">
            {reqs.map((r, i) => <span key={i} className="border-[1.5px] border-tinta px-1.5 py-0.5 text-[11px]">{siglaDe(r.atributo)} {dois(r.minimo)}</span>)}
          </div>
          <div className="flex justify-between border-t border-dashed border-tinta pt-1 text-xs">
            <span><b>Recompensa:</b> +{xp} XP</span><span>Duração {duracaoTexto(duracao)}</span>
          </div>
        </div>
      </div>

      {msg && (
        <p role="status" className={`m-0 border border-dashed p-2 text-xs ${msg.ok ? "border-verde text-verde" : "border-carimbo text-carimbo"}`}>{msg.texto}</p>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" className="btn btn-pri min-h-12 text-sm tracking-[1px]" disabled={bloqueada || salvando} onClick={() => salvar(true)}>
          {salvando ? "SALVANDO…" : "PUBLICAR ORDEM"}
        </button>
        <div className="flex gap-2">
          <button type="button" className="btn min-h-12 flex-1" disabled={bloqueada || salvando} onClick={() => salvar(false)}>SALVAR RASCUNHO</button>
          <Link href="/coordenacao/missoes" className="btn min-h-12 flex-1">CANCELAR</Link>
        </div>
      </div>
      <p className="m-0 text-[11px] leading-snug opacity-70">
        Ordens publicadas ficam visíveis imediatamente para os pacientes com os requisitos atendidos.
      </p>
    </>
  );
}
