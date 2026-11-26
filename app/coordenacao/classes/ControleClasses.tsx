"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Anotacao, Carimbo, Titulo } from "@/components/ui";
import { Figurinha, OPCOES_FOTO, type OpcaoFoto } from "@/components/Figurinha";
import { CORES_CARIMBO, LIMITE_DESCRICAO_CLASSE, LIMITE_NOME_CLASSE, type Classe } from "@/lib/classes-base";
import { dois } from "@/lib/regras";
import { apagarClasse, novaClasse, salvarClasse } from "./actions";

type ClasseVista = Classe & { padrao: boolean; pacientes: number };
type Rascunho = Pick<Classe, "nome" | "descricao" | "cor" | "figurinha">;

export function ControleClasses({ classes }: { classes: ClasseVista[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string | null>(null);
  const [rasc, setRasc] = useState<Rascunho | null>(null);
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [ocupado, iniciar] = useTransition();

  const abrir = (c: ClasseVista) => {
    setMsg(null);
    if (sel === c.id) {
      setSel(null);
      return setRasc(null);
    }
    setSel(c.id);
    setRasc({ nome: c.nome, descricao: c.descricao, cor: c.cor, figurinha: c.figurinha });
  };

  const executar = (acao: () => Promise<{ ok: true; msg: string; id?: string } | { ok: false; erro: string }>, depois?: (id?: string) => void) =>
    iniciar(async () => {
      const r = await acao();
      setMsg(r.ok ? { texto: r.msg, ok: true } : { texto: r.erro, ok: false });
      if (r.ok) {
        depois?.(r.id);
        router.refresh();
      }
    });

  const mudar = (o: Partial<Rascunho>) => setRasc((r) => (r ? { ...r, ...o } : r));

  return (
    <>
      <section className="flex flex-col gap-2">
        <Titulo>CATÁLOGO DE CLASSES</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Classificações que a equipe pode atribuir aos pacientes. A classe é só registro clínico: não altera XP, atributos nem missões.
        </p>
        <div className="flex justify-between text-xs">
          <span>Classes: <b>{dois(classes.length)}</b></span>
          <span>Padrão na internação: <b>{classes.find((c) => c.padrao)?.nome ?? "—"}</b></span>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        {classes.map((c) => {
          const aberto = sel === c.id && rasc;
          return (
            <div key={c.id} className="flex flex-col">
              <button type="button" aria-expanded={!!aberto} onClick={() => abrir(c)}
                className={`flex min-h-14 w-full items-center gap-2.5 border-[1.5px] border-tinta px-3 py-2.5 text-left ${aberto ? "bg-tinta text-papel" : "bg-papel-claro"}`}>
                <Figurinha opcao={c.figurinha} largura={40} giro={0} carimbo={false} prefixo={`cl-${c.id}`} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="self-start border-[2.5px] px-1.5 py-px font-maquina text-xs tracking-[2px]"
                    style={{ borderColor: aberto ? "currentColor" : c.cor, color: aberto ? undefined : c.cor, transform: "rotate(-3deg)" }}>{c.nome}</span>
                  <span className="text-[11px] opacity-85">
                    {c.padrao ? "PADRÃO · " : ""}{dois(c.pacientes)} paciente{c.pacientes === 1 ? "" : "s"} · fig. {dois(c.figurinha)}
                  </span>
                </span>
                <span aria-hidden="true">{aberto ? "▾" : "▸"}</span>
              </button>

              {aberto && rasc && (
                <div className="flex flex-col gap-3 border-[1.5px] border-t-0 border-tinta bg-papel-campo p-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`nome-${c.id}`} className="rotulo">NOME DA CLASSE</label>
                    <input id={`nome-${c.id}`} className="campo uppercase" maxLength={LIMITE_NOME_CLASSE} value={rasc.nome}
                      onChange={(e) => mudar({ nome: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`desc-${c.id}`} className="rotulo">DESCRIÇÃO (VISÍVEL AO PACIENTE NA FICHA)</label>
                    <textarea id={`desc-${c.id}`} className="campo bg-white" rows={3} maxLength={LIMITE_DESCRICAO_CLASSE} value={rasc.descricao}
                      onChange={(e) => mudar({ descricao: e.target.value })} />
                  </div>
                  <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
                    <legend className="rotulo mb-1.5 p-0">COR DO CARIMBO</legend>
                    <div className="flex flex-wrap gap-2.5">
                      {CORES_CARIMBO.map((k) => (
                        <button key={k.valor} type="button" aria-label={k.nome} aria-pressed={rasc.cor === k.valor} onClick={() => mudar({ cor: k.valor })}
                          className={`h-10 w-10 cursor-pointer rounded-full border-0 p-0 ${rasc.cor === k.valor ? "outline-2 outline-offset-2 outline-tinta outline-solid" : ""}`}
                          style={{ background: k.valor }} />
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
                    <legend className="rotulo mb-1.5 p-0">FIGURINHA SUGERIDA</legend>
                    <div className="grid grid-cols-5 gap-1.5">
                      {OPCOES_FOTO.map((n) => (
                        <button key={n} type="button" aria-label={`Figurinha ${dois(n)}`} aria-pressed={rasc.figurinha === n}
                          onClick={() => mudar({ figurinha: n as OpcaoFoto })}
                          className={`flex cursor-pointer flex-col items-center gap-1 border-2 bg-transparent px-0 pt-1.5 pb-1 font-mono text-[10px] text-tinta ${rasc.figurinha === n ? "border-verde bg-papel-escuro" : "border-transparent"}`}>
                          <Figurinha opcao={n} largura={48} giro={0} carimbo={false} prefixo={`clf-${c.id}-${n}`} />
                          {dois(n)}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] opacity-75">Aparece marcada como “sugerida pela equipe” na troca de foto da ficha. O paciente escolhe se usa.</span>
                  </fieldset>
                  <div className="flex flex-col gap-1.5 border border-dashed border-tinta bg-papel-claro p-2.5">
                    <span className="rotulo">PRÉVIA NA FICHA</span>
                    <Carimbo cor={rasc.cor}>CLASSE: {rasc.nome.toLocaleUpperCase("pt-BR") || "SEM NOME"}</Carimbo>
                    {rasc.descricao.trim() && <span className="text-xs leading-snug">{rasc.descricao}</span>}
                  </div>
                  <div className="flex gap-2">
                    {!c.padrao && c.pacientes === 0 && (
                      <button type="button" className="btn flex-1" disabled={ocupado}
                        onClick={() => executar(() => apagarClasse(c.id), () => { setSel(null); setRasc(null); })}>APAGAR</button>
                    )}
                    <button type="button" className="btn btn-pri flex-[2]" disabled={ocupado}
                      onClick={() => executar(() => salvarClasse({ id: c.id, ...rasc }))}>{ocupado ? "SALVANDO…" : "SALVAR CLASSE"}</button>
                  </div>
                  <span className="text-[11px] leading-snug opacity-75">
                    {c.padrao
                      ? "Classe padrão: todo paciente novo entra com ela. Pode ser renomeada, não apagada."
                      : c.pacientes > 0
                        ? "Com pacientes nela, não pode ser apagada. Reclassifique-os antes."
                        : "Sem pacientes: pode ser apagada."}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" className="btn border-dashed" disabled={ocupado}
        onClick={() => executar(novaClasse, (id) => { if (id) { setSel(id); setRasc({ nome: "NOVA CLASSE", descricao: "", cor: "#8a3b2e", figurinha: 1 }); } })}>
        + NOVA CLASSE
      </button>
      {msg && <p role="status" className={`m-0 text-xs ${msg.ok ? "text-verde" : "text-carimbo"}`}>{msg.texto}</p>}
      <Anotacao>alguém criou uma classe sem nome. ela tem um paciente.</Anotacao>
      <p className="m-0 text-[11px] leading-snug opacity-75">
        Reclassificações são feitas no painel PACIENTES. O paciente recebe um aviso e a mudança entra no histórico.
      </p>
    </>
  );
}
