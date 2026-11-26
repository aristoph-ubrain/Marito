"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Figurinha, FotoProntuario, OPCOES_FOTO, TEMA_FOTO, type OpcaoFoto } from "@/components/Figurinha";
import { escolherFoto } from "../actions";

/**
 * Linha de identificação da ficha com a foto.
 * Sem foto: o seletor fica aberto. Com foto: o seletor some e reabre ao tocar na foto atual.
 */
export function FotoFicha({
  atual,
  prontuario,
  sugerida = null,
  children,
}: {
  atual: OpcaoFoto | null;
  prontuario: string;
  sugerida?: OpcaoFoto | null; // figurinha sugerida pela classe do paciente
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, iniciar] = useTransition();
  const mostrarSeletor = aberto || !atual;

  const escolher = (n: OpcaoFoto) => {
    setErro("");
    if (n === atual) return setAberto(false);
    iniciar(async () => {
      const r = await escolherFoto(n);
      if (!r.ok) return setErro(r.erro);
      setAberto(false);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex items-start gap-3.5">
        {children}
        {atual ? (
          <button
            type="button"
            onClick={() => setAberto(true)}
            aria-label="Foto atual. Toque para trocar"
            aria-expanded={mostrarSeletor}
            className="flex cursor-pointer flex-col items-center gap-2.5 border-0 bg-transparent p-0 font-mono text-tinta"
          >
            <span key={atual} className="anim-revela"><FotoProntuario opcao={atual} prontuario={prontuario} prefixo="ficha" /></span>
            <span className="text-[10px] tracking-[.5px] opacity-70">toque para trocar</span>
          </button>
        ) : (
          <FotoProntuario opcao={null} prontuario={prontuario} prefixo="ficha" />
        )}
      </div>

      {mostrarSeletor && (
        <div className="flex flex-col gap-2.5 border-[1.5px] border-dashed border-tinta p-2.5">
          <span className="rotulo">FOTO DO PRONTUÁRIO · ESCOLHA UMA FIGURINHA</span>
          <div role="group" aria-label="Opções de foto" className="grid grid-cols-3 gap-1.5">
            {OPCOES_FOTO.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={atual === n}
                aria-label={`Usar a foto opção ${String(n).padStart(2, "0")}${TEMA_FOTO[n] ? ` (${TEMA_FOTO[n]})` : ""}${sugerida === n ? ", sugerida pela equipe" : ""}`}
                disabled={salvando}
                onClick={() => escolher(n)}
                className={`flex min-w-0 cursor-pointer flex-col items-center gap-2 border-2 px-0.5 pt-2 pb-1.5 font-mono text-tinta ${
                  atual === n ? "border-verde bg-papel-escuro" : "border-transparent bg-transparent"
                }`}
              >
                <Figurinha opcao={n} largura={88} giro={0} carimbo={false} prefixo={`sel${n}`} />
                <span className="text-center text-[11px] leading-tight tracking-[1px]">OPÇÃO {String(n).padStart(2, "0")}{TEMA_FOTO[n] && <><br /><span className="text-[9px] opacity-70">{TEMA_FOTO[n]!.toUpperCase()}</span></>}</span>
                {sugerida === n && <span className="border border-carimbo px-1 text-[9px] leading-tight tracking-[.5px] text-carimbo">SUGERIDA PELA EQUIPE</span>}
              </button>
            ))}
          </div>
          {erro && <p role="alert" className="m-0 text-xs text-carimbo">{erro}</p>}
          {salvando && <p role="status" className="m-0 text-xs opacity-75">Registrando a foto…</p>}
          {atual ? (
            <button type="button" className="btn self-start text-xs" onClick={() => setAberto(false)}>MANTER FOTO ATUAL</button>
          ) : (
            <p className="m-0 text-xs opacity-75">Toque numa figurinha para colocá-la na ficha.</p>
          )}
        </div>
      )}
    </>
  );
}
