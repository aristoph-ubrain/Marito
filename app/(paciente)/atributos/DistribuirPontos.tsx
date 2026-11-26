"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Anotacao, MarcasContagem, Rodape, Titulo } from "@/components/ui";
import { ATRIBUTOS, atributosZerados, type ChaveAtributo } from "@/lib/atributos";
import {
  automacaoLiberada,
  HABILIDADES,
  PASSO_MARCO,
  PLANOS,
  resumoHabilidades,
  type Automacao,
  type Automacoes,
  type Plano,
} from "@/lib/habilidades";
import { dois } from "@/lib/regras";
import { alternarAutomacao, escolherPlano, registrarAvaliacao } from "../actions";

type Valores = Record<ChaveAtributo, number>;

export function DistribuirPontos({ atributos, pontos, automacoes }: { atributos: Valores; pontos: number; automacoes: Automacoes }) {
  const router = useRouter();
  const [pendente, setPendente] = useState<Valores>(atributosZerados);
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [salvando, iniciar] = useTransition();

  const usados = Object.values(pendente).reduce((s, n) => s + n, 0);
  const restam = pontos - usados;
  const comPendente = Object.fromEntries(ATRIBUTOS.map((a) => [a.chave, atributos[a.chave] + pendente[a.chave]])) as Valores;
  const resumo = resumoHabilidades(comPendente);

  const mudar = (c: ChaveAtributo, d: number) => {
    setMsg(null);
    setPendente((p) => ({ ...p, [c]: Math.max(0, p[c] + d) }));
  };

  const executar = (acao: () => Promise<{ ok: true; msg?: string } | { ok: false; erro: string }>, limpar = false) =>
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) return setMsg({ texto: r.erro, ok: false });
      if (limpar) setPendente(atributosZerados());
      setMsg(r.msg ? { texto: r.msg, ok: true } : null);
      router.refresh();
    });

  const plano: Plano = automacoes.plano ?? { tipo: "igual" };

  return (
    <section className="flex flex-col gap-3">
      <Titulo>III. ATRIBUTOS E HABILIDADES</Titulo>
      <p className="m-0 text-xs leading-snug opacity-85">
        Cada ponto fortalece a habilidade do atributo. A cada {PASSO_MARCO} pontos, o atributo abre um marco.
      </p>
      <div className="flex items-center justify-between border-2 border-tinta px-3 py-2.5">
        <span className="text-[13px] tracking-[.5px]">PONTOS DISPONÍVEIS</span>
        <span className="font-maquina text-[30px]" aria-live="polite">{restam}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 border border-dashed border-tinta px-2.5 py-2 text-xs" aria-label="Efeito somado das habilidades">
        <span>Duração: <b>{resumo.duracao}</b></span>
        <span>XP extra: <b>{resumo.xp}</b></span>
        <span>Teto offline: <b>{resumo.teto}</b></span>
        <span>Chance de dobro: <b>{resumo.dobro}</b></span>
      </div>
      <Anotacao>Vínculo subiu de novo sem registro. Quem aprovou?</Anotacao>

      <ul className="m-0 flex list-none flex-col p-0">
        {ATRIBUTOS.map((a) => {
          const base = atributos[a.chave];
          const v = base + pendente[a.chave];
          const h = HABILIDADES[a.chave];
          const prox = (Math.floor(v / PASSO_MARCO) + 1) * PASSO_MARCO;
          const falta = prox - v;
          return (
            <li key={a.chave} className="flex flex-col gap-1.5 border-t border-tinta/35 py-2.5">
              <div className="flex items-center gap-2">
                <b className="flex-1 text-sm tracking-[.5px]">{a.nome.toUpperCase()}</b>
                {pendente[a.chave] > 0 && <span className="text-xs text-verde">+{pendente[a.chave]} pendente</span>}
                <span className="min-w-7 text-right font-maquina text-xl">{dois(v)}</span>
              </div>
              <p className="m-0 text-xs leading-snug opacity-85">{a.descricao}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <MarcasContagem base={base} valor={v} />
                </div>
                <button type="button" className="btn h-11 w-11 p-0 text-xl" aria-label={`Remover ponto de ${a.nome}`}
                  disabled={pendente[a.chave] === 0 || salvando} onClick={() => mudar(a.chave, -1)}>−</button>
                <button type="button" className="btn btn-escuro h-11 w-11 p-0 text-xl" aria-label={`Adicionar ponto em ${a.nome}`}
                  disabled={restam <= 0 || salvando} onClick={() => mudar(a.chave, 1)}>+</button>
              </div>

              <div className="flex flex-col gap-1.5 border border-tinta/50 bg-papel-claro px-2.5 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="m-0 font-maquina text-sm font-normal">{h.nome.toUpperCase()}</h3>
                  <span className="text-xs">
                    agora: <b className="text-verde">{pendente[a.chave] > 0 ? `${h.agora(base)} → ${h.agora(v)}` : h.agora(v)}</b>
                  </span>
                </div>
                <span className="text-xs leading-snug">{h.regra}</span>
                <div className="h-2.5 border-[1.5px] border-tinta p-px" role="progressbar" aria-label={`Progresso até o próximo marco de ${a.nome}`}
                  aria-valuemin={prox - PASSO_MARCO} aria-valuenow={v} aria-valuemax={prox}>
                  <div className="h-full bg-[repeating-linear-gradient(90deg,var(--color-tinta)_0_5px,transparent_5px_7px)]"
                    style={{ width: `${((v - (prox - PASSO_MARCO)) / PASSO_MARCO) * 100}%` }} />
                </div>
                <span className="text-[11px] opacity-80">Próximo marco: {a.sigla} {dois(prox)} · faltam {falta} ponto{falta > 1 ? "s" : ""}</span>

                {h.marcos.map((m) => {
                  const aberto = base >= m.n;
                  const quase = !aberto && v >= m.n;
                  const ligado = !!(m.auto && automacoes[m.auto]);
                  return (
                    <div key={m.n} className={`flex flex-col gap-1.5 border-t border-dashed border-tinta pt-1.5 ${aberto ? "" : "opacity-60"}`}>
                      <div className="flex items-center gap-2 text-xs leading-snug">
                        <span className={`min-w-[26px] border-[1.5px] px-0.5 text-center font-maquina ${aberto ? "border-verde bg-verde text-papel-claro" : "border-tinta"}`}>{dois(m.n)}</span>
                        <span className="flex-1">{m.texto}{quase ? " (abre ao registrar)" : ""}</span>
                        {aberto && m.auto && (
                          <Interruptor chave={m.auto} ligado={ligado} ocupado={salvando}
                            alternar={(k, l) => executar(() => alternarAutomacao(k, l))} />
                        )}
                        {!aberto && <span className="text-[10px] tracking-[.5px]">BLOQUEADO</span>}
                      </div>
                      {aberto && m.auto === "pontos" && automacaoLiberada("pontos", atributos) && (
                        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0 pl-8 text-xs" disabled={salvando}>
                          <legend className="mb-1 p-0 text-[11px] tracking-[.5px]">PLANO DE DISTRIBUIÇÃO</legend>
                          {PLANOS.map((op) => (
                            <label key={op.tipo} className="flex min-h-8 items-center gap-2">
                              <input type="radio" name="plano" checked={plano.tipo === op.tipo}
                                onChange={() => executar(() => escolherPlano(op.tipo === "um" ? { tipo: "um", chave: "FOR" } : { tipo: op.tipo }))} />
                              {op.rotulo}
                            </label>
                          ))}
                          {plano.tipo === "um" && (
                            <label className="flex items-center gap-2 pl-6">
                              Atributo:
                              <select className="campo min-h-8 py-0 text-xs" value={plano.chave}
                                onChange={(e) => executar(() => escolherPlano({ tipo: "um", chave: e.target.value as ChaveAtributo }))}>
                                {ATRIBUTOS.map((x) => <option key={x.chave} value={x.chave}>{x.nome}</option>)}
                              </select>
                            </label>
                          )}
                        </fieldset>
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      {msg && <p role="status" className={`m-0 text-xs ${msg.ok ? "text-verde" : "text-carimbo"}`}>{msg.texto}</p>}
      <div className="flex gap-2 pt-1.5">
        <button type="button" className="btn min-h-12 flex-1" disabled={usados === 0 || salvando} onClick={() => setPendente(atributosZerados())}>
          DESFAZER
        </button>
        <button type="button" className="btn btn-pri min-h-12 flex-[2] tracking-[1px]" disabled={usados === 0 || salvando}
          onClick={() => executar(() => registrarAvaliacao(pendente), true)}>
          {salvando ? "REGISTRANDO…" : "REGISTRAR AVALIAÇÃO"}
        </button>
      </div>
      <Anotacao style={{ transform: "rotate(1deg)" }}>subi VIN e agora eu entendo o que o 0112 escreve no chat. preferia não entender.</Anotacao>
      <Rodape>Avaliador: Dr. ██████ · Observação: o paciente não deve ter acesso a este documento.</Rodape>
    </section>
  );
}

function Interruptor({ chave, ligado, ocupado, alternar }: { chave: Automacao; ligado: boolean; ocupado: boolean; alternar: (k: Automacao, l: boolean) => void }) {
  return (
    <button type="button" className={`btn min-h-8 whitespace-nowrap px-2.5 text-[11px] tracking-[.5px] ${ligado ? "btn-escuro" : ""}`}
      aria-pressed={ligado} disabled={ocupado} onClick={() => alternar(chave, !ligado)}>
      {ligado ? "LIGADO" : "DESLIGADO"}
    </button>
  );
}
