"use client";

import Link from "next/link";
import { useState } from "react";
import { ATRIBUTOS, siglaDe, type ChaveAtributo } from "@/lib/mock";
import { dois } from "@/lib/regras";

const ALAS = ["TÉRREO", "ALA A", "ALA B", "CONSULTÓRIOS", "ALA C", "CAPELA"];
const DURACOES = ["00:10", "00:20", "00:30", "00:50", "01:00", "02:00", "05:00"];

export function EditorOrdem() {
  const [titulo, setTitulo] = useState("Ronda na Capela");
  const [ala, setAla] = useState("CAPELA");
  const [descricao, setDescricao] = useState("Verificar se as velas estão apagadas. Não responder se alguém chamar pelo nome.");
  const [reqs, setReqs] = useState<{ atributo: ChaveAtributo; minimo: number }[]>([
    { atributo: "RIT", minimo: 3 },
    { atributo: "AFI", minimo: 4 },
  ]);
  const [xp, setXp] = useState(200);
  const [duracao, setDuracao] = useState("00:50");
  const [publicada, setPublicada] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);

  const mudarReq = (i: number, o: Partial<{ atributo: ChaveAtributo; minimo: number }>) => {
    setReqs((r) => r.map((x, j) => (j === i ? { ...x, ...o } : x)));
    setMsg(null);
  };

  // Etapa 4: virará server action que grava a ordem.
  const salvar = (publicar: boolean) => {
    if (!titulo.trim()) return setMsg({ texto: "Informe o título da ordem.", ok: false });
    if (!reqs.length) return setMsg({ texto: "Inclua ao menos um requisito.", ok: false });
    if (new Set(reqs.map((r) => r.atributo)).size !== reqs.length) return setMsg({ texto: "Há atributos repetidos nos requisitos.", ok: false });
    setPublicada(publicar);
    setMsg({ texto: publicar ? "Ordem OS-031 publicada. Já visível para os pacientes elegíveis." : "Rascunho salvo.", ok: true });
  };

  const corSit = publicada ? "var(--color-verde)" : "var(--color-ocre)";

  return (
    <>
      <Link href="/coordenacao/missoes" className="text-xs">← Voltar às ordens</Link>
      <div className="flex items-end justify-between border-b border-tinta pb-2">
        <div className="flex flex-col gap-0.5">
          <span className="rotulo">EDIÇÃO DE ORDEM</span>
          <span className="font-maquina text-2xl leading-none">OS-031</span>
        </div>
        <span className="border-2 px-1.5 py-0.5 text-[11px] tracking-[1px]" style={{ borderColor: corSit, color: corSit }}>
          {publicada ? "PUBLICADA" : "RASCUNHO"}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="titulo" className="rotulo">TÍTULO</label>
        <input id="titulo" className="campo" value={titulo} onChange={(e) => { setTitulo(e.target.value); setMsg(null); }} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ala" className="rotulo">ALA</label>
        <select id="ala" className="campo" value={ala} onChange={(e) => setAla(e.target.value)}>
          {ALAS.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="descricao" className="rotulo">DESCRIÇÃO (visível ao paciente)</label>
        <textarea id="descricao" className="campo" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
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
          <select id="duracao" className="campo" value={duracao} onChange={(e) => setDuracao(e.target.value)}>
            {DURACOES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="rotulo">PRÉ-VISUALIZAÇÃO · COMO O PACIENTE VÊ</span>
        <div className="flex flex-col gap-1.5 border-[1.5px] border-tinta bg-papel-claro p-3 shadow-[3px_3px_0_rgba(43,38,32,.25)]">
          <div className="flex justify-between border-b border-dashed border-tinta pb-1 text-[11px]"><span>OS-031</span><span>{ala}</span></div>
          <b className="font-maquina text-base font-normal">{titulo || "(sem título)"}</b>
          <p className="m-0 text-xs leading-snug opacity-90">{descricao}</p>
          <div className="flex flex-wrap gap-1.5">
            {reqs.map((r, i) => <span key={i} className="border-[1.5px] border-tinta px-1.5 py-0.5 text-[11px]">{siglaDe(r.atributo)} {dois(r.minimo)}</span>)}
          </div>
          <div className="flex justify-between border-t border-dashed border-tinta pt-1 text-xs">
            <span><b>Recompensa:</b> +{xp} XP</span><span>Duração {duracao}</span>
          </div>
        </div>
      </div>

      {msg && (
        <p role="status" className={`m-0 border border-dashed p-2 text-xs ${msg.ok ? "border-verde text-verde" : "border-carimbo text-carimbo"}`}>{msg.texto}</p>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" className="btn btn-pri min-h-12 text-sm tracking-[1px]" onClick={() => salvar(true)}>PUBLICAR ORDEM</button>
        <div className="flex gap-2">
          <button type="button" className="btn min-h-12 flex-1" onClick={() => salvar(false)}>SALVAR RASCUNHO</button>
          <Link href="/coordenacao/missoes" className="btn min-h-12 flex-1">CANCELAR</Link>
        </div>
      </div>
      <p className="m-0 text-[11px] leading-snug opacity-70">
        Ordens publicadas ficam visíveis imediatamente para os pacientes com os requisitos atendidos.
      </p>
    </>
  );
}
