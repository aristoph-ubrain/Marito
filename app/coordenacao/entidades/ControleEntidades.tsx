"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DesenhoEntidade } from "@/components/Entidade";
import { Anotacao, Titulo } from "@/components/ui";
import { LIMITE_DESCRICAO_ENTIDADE, LIMITE_NOME_ENTIDADE, MAX_LUAS_ENTREGA, RARIDADES, type Entidade } from "@/lib/entidades-base";
import { dois } from "@/lib/regras";
import { deixarLuas, restaurarEntidade, salvarEntidade } from "./actions";

type EntidadeVista = Entidade & { editada: boolean; pacientes: number };

export function ControleEntidades({
  entidades,
  originais,
  pacientes,
}: {
  entidades: EntidadeVista[];
  originais: Entidade[];
  pacientes: { id: string; nome: string; luas: number }[];
}) {
  const router = useRouter();
  const [pac, setPac] = useState(pacientes[0]?.id ?? "");
  const [qtd, setQtd] = useState(1);
  const [sel, setSel] = useState<string | null>(null);
  const [rasc, setRasc] = useState({ nome: "", descricao: "" });
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [ocupado, iniciar] = useTransition();

  const executar = (acao: () => Promise<{ ok: true; msg: string } | { ok: false; erro: string }>, depois?: () => void) =>
    iniciar(async () => {
      const r = await acao();
      setMsg(r.ok ? { texto: r.msg, ok: true } : { texto: r.erro, ok: false });
      if (r.ok) {
        depois?.();
        router.refresh();
      }
    });

  const escolhido = pacientes.find((p) => p.id === pac);

  return (
    <>
      <section className="flex flex-col gap-2">
        <Titulo>LUA NEGRA · ENTREGAR</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Além de 1% por ordem concluída, a coordenação pode deixar Luas Negras para um paciente. Ele recebe um aviso: “uma lua foi deixada no
          seu leito”.
        </p>
        <div className="flex flex-col gap-2 border-[1.5px] border-tinta p-2.5">
          <label htmlFor="pac" className="rotulo">PACIENTE</label>
          <select id="pac" className="campo" value={pac} onChange={(e) => setPac(e.target.value)}>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.nome}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="rotulo flex-1">QUANTIDADE</span>
            <button type="button" className="btn h-11 w-11 p-0 text-lg" aria-label="Menos uma" disabled={qtd <= 1} onClick={() => setQtd(qtd - 1)}>−</button>
            <b className="min-w-8 text-center font-maquina text-[22px] font-normal" aria-live="polite">{qtd}</b>
            <button type="button" className="btn h-11 w-11 p-0 text-lg" aria-label="Mais uma" disabled={qtd >= MAX_LUAS_ENTREGA} onClick={() => setQtd(qtd + 1)}>+</button>
          </div>
          <button type="button" className="btn btn-pri" disabled={ocupado || !pac} onClick={() => executar(() => deixarLuas(pac, qtd))}>DEIXAR NO LEITO</button>
          {escolhido && (
            <span className="text-[11px] opacity-75">
              {escolhido.nome.split(" ")[0]} tem {escolhido.luas} Lua{escolhido.luas === 1 ? "" : "s"} Negra{escolhido.luas === 1 ? "" : "s"} agora. Máximo de {MAX_LUAS_ENTREGA} por entrega.
            </span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <Titulo>ENTIDADES</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">Nome e descrição de cada entidade, como os pacientes veem. O desenho e a raridade são fixos.</p>
        {entidades.map((e) => {
          const aberto = sel === e.id;
          return (
            <div key={e.id} className="flex flex-col">
              <button type="button" aria-expanded={aberto}
                onClick={() => { setMsg(null); setSel(aberto ? null : e.id); setRasc({ nome: e.nome, descricao: e.descricao }); }}
                className={`flex min-h-14 w-full items-center gap-2.5 border-[1.5px] border-tinta px-3 py-2 text-left ${aberto ? "bg-tinta text-papel" : "bg-papel-claro"}`}>
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#f4efe2]"><DesenhoEntidade id={e.id} tamanho={36} /></span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px]">{e.nome}</span>
                  <span className="text-[11px] opacity-85">
                    {RARIDADES[e.raridade].rotulo} · invocada por {dois(e.pacientes)} paciente{e.pacientes === 1 ? "" : "s"}{e.editada ? " · EDITADA" : ""}
                  </span>
                </span>
                <span aria-hidden="true">{aberto ? "▾" : "▸"}</span>
              </button>
              {aberto && (
                <div className="flex flex-col gap-2.5 border-[1.5px] border-t-0 border-tinta bg-papel-campo p-3">
                  <label htmlFor={`en-${e.id}`} className="rotulo">NOME</label>
                  <input id={`en-${e.id}`} className="campo" maxLength={LIMITE_NOME_ENTIDADE} value={rasc.nome} onChange={(ev) => setRasc({ ...rasc, nome: ev.target.value })} />
                  <label htmlFor={`ed-${e.id}`} className="rotulo">DESCRIÇÃO</label>
                  <textarea id={`ed-${e.id}`} className="campo bg-white" rows={3} maxLength={LIMITE_DESCRICAO_ENTIDADE} value={rasc.descricao}
                    onChange={(ev) => setRasc({ ...rasc, descricao: ev.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" className="btn flex-1" disabled={ocupado}
                      onClick={() => {
                        const o = originais.find((x) => x.id === e.id);
                        if (!o) return;
                        if (e.editada) executar(() => restaurarEntidade(e.id), () => setRasc({ nome: o.nome, descricao: o.descricao }));
                        else setRasc({ nome: o.nome, descricao: o.descricao });
                      }}>ORIGINAL</button>
                    <button type="button" className="btn btn-pri flex-[2]" disabled={ocupado || !rasc.nome.trim()}
                      onClick={() => executar(() => salvarEntidade(e.id, rasc.nome, rasc.descricao))}>SALVAR</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
      {msg && <p role="status" className={`m-0 text-xs ${msg.ok ? "text-verde" : "text-carimbo"}`}>{msg.texto}</p>}
      <Anotacao>ninguém aqui entregou a lua do 0121.</Anotacao>
    </>
  );
}
