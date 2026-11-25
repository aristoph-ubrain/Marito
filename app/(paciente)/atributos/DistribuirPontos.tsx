"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Anotacao, MarcasContagem, Rodape, Titulo } from "@/components/ui";
import { ATRIBUTOS, atributosZerados, type ChaveAtributo } from "@/lib/atributos";
import { dois } from "@/lib/regras";
import { registrarAvaliacao } from "../actions";

type Valores = Record<ChaveAtributo, number>;

export function DistribuirPontos({ atributos, pontos }: { atributos: Valores; pontos: number }) {
  const router = useRouter();
  const [pendente, setPendente] = useState<Valores>(atributosZerados);
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [salvando, iniciar] = useTransition();

  const usados = Object.values(pendente).reduce((s, n) => s + n, 0);
  const restam = pontos - usados;

  const mudar = (c: ChaveAtributo, d: number) => {
    setMsg(null);
    setPendente((p) => ({ ...p, [c]: Math.max(0, p[c] + d) }));
  };

  const registrar = () =>
    iniciar(async () => {
      const r = await registrarAvaliacao(pendente);
      if (!r.ok) return setMsg({ texto: r.erro, ok: false });
      setPendente(atributosZerados());
      setMsg({ texto: r.msg ?? "Avaliação registrada.", ok: true });
      router.refresh();
    });

  return (
    <section className="flex flex-col gap-3">
      <Titulo>III. ATRIBUTOS</Titulo>
      <div className="flex items-center justify-between border-2 border-tinta px-3 py-2.5">
        <span className="text-[13px] tracking-[.5px]">PONTOS DISPONÍVEIS</span>
        <span className="font-maquina text-[30px]" aria-live="polite">{restam}</span>
      </div>
      <Anotacao>Vínculo subiu de novo sem registro. Quem aprovou?</Anotacao>

      <ul className="m-0 flex list-none flex-col p-0">
        {ATRIBUTOS.map((a) => {
          const base = atributos[a.chave];
          const v = base + pendente[a.chave];
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
            </li>
          );
        })}
      </ul>

      {msg && <p role="status" className={`m-0 text-xs ${msg.ok ? "text-verde" : "text-carimbo"}`}>{msg.texto}</p>}
      <div className="flex gap-2 pt-1.5">
        <button type="button" className="btn min-h-12 flex-1" disabled={usados === 0 || salvando} onClick={() => setPendente(atributosZerados())}>
          DESFAZER
        </button>
        <button type="button" className="btn btn-pri min-h-12 flex-[2] tracking-[1px]" disabled={usados === 0 || salvando} onClick={registrar}>
          {salvando ? "REGISTRANDO…" : "REGISTRAR AVALIAÇÃO"}
        </button>
      </div>
      <Rodape>Avaliador: Dr. ██████ · Observação: o paciente não deve ter acesso a este documento.</Rodape>
    </section>
  );
}
