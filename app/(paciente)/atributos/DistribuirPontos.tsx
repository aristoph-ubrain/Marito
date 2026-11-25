"use client";

import { useState } from "react";
import { Anotacao, MarcasContagem, Rodape, Titulo } from "@/components/ui";
import { ATRIBUTOS, type ChaveAtributo } from "@/lib/mock";
import { dois } from "@/lib/regras";

type Valores = Record<ChaveAtributo, number>;
const zerado = () => Object.fromEntries(ATRIBUTOS.map((a) => [a.chave, 0])) as Valores;

export function DistribuirPontos({ atributos, pontos }: { atributos: Valores; pontos: number }) {
  const [base, setBase] = useState<Valores>(atributos);
  const [pendente, setPendente] = useState<Valores>(zerado);
  const [disponiveis, setDisponiveis] = useState(pontos);

  const usados = Object.values(pendente).reduce((s, n) => s + n, 0);
  const restam = disponiveis - usados;

  const mudar = (c: ChaveAtributo, d: number) =>
    setPendente((p) => ({ ...p, [c]: Math.max(0, p[c] + d) }));

  const registrar = () => {
    // Etapa 4: virará uma server action que grava no banco.
    setBase((b) => Object.fromEntries(ATRIBUTOS.map((a) => [a.chave, b[a.chave] + pendente[a.chave]])) as Valores);
    setDisponiveis(restam);
    setPendente(zerado());
  };

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
          const v = base[a.chave] + pendente[a.chave];
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
                  <MarcasContagem base={base[a.chave]} valor={v} />
                </div>
                <button
                  type="button"
                  className="btn h-11 w-11 p-0 text-xl"
                  aria-label={`Remover ponto de ${a.nome}`}
                  disabled={pendente[a.chave] === 0}
                  onClick={() => mudar(a.chave, -1)}
                >
                  −
                </button>
                <button
                  type="button"
                  className="btn btn-escuro h-11 w-11 p-0 text-xl"
                  aria-label={`Adicionar ponto em ${a.nome}`}
                  disabled={restam <= 0}
                  onClick={() => mudar(a.chave, 1)}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2 pt-1.5">
        <button type="button" className="btn min-h-12 flex-1" disabled={usados === 0} onClick={() => setPendente(zerado())}>
          DESFAZER
        </button>
        <button type="button" className="btn btn-pri min-h-12 flex-[2] tracking-[1px]" disabled={usados === 0} onClick={registrar}>
          REGISTRAR AVALIAÇÃO
        </button>
      </div>
      <Rodape>Avaliador: Dr. ██████ · Observação: o paciente não deve ter acesso a este documento.</Rodape>
    </section>
  );
}
