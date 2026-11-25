"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Censura } from "@/components/ui";
import { LIMITE_RELATO } from "@/lib/cadastro";
import { editarRelato } from "../actions";

/** Relato de entrada na ficha: o paciente pode reescrevê-lo. */
export function RelatoEditavel({ relato }: { relato: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(relato);
  const [erro, setErro] = useState("");
  const [salvando, iniciar] = useTransition();

  const abrir = () => {
    setTexto(relato);
    setErro("");
    setEditando(true);
  };

  const salvar = () =>
    iniciar(async () => {
      const r = await editarRelato(texto);
      if (!r.ok) return setErro(r.erro);
      setEditando(false);
      router.refresh();
    });

  if (!editando)
    return (
      <div className="flex flex-col gap-2">
        <div className="min-w-0 border-l-2 border-tinta pl-2.5 text-[13px] whitespace-pre-line [overflow-wrap:anywhere]">
          {relato ? <>“{relato}”</> : "Paciente não quis relatar o motivo da internação."} <Censura>paciente descreve a ala</Censura>
        </div>
        <button type="button" onClick={abrir} className="btn min-h-10 self-start px-3 text-xs tracking-[.5px]">
          EDITAR RELATO
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="relato" className="rotulo">RELATO DO PACIENTE · {texto.length}/{LIMITE_RELATO}</label>
      <textarea
        id="relato"
        className="campo"
        rows={6}
        maxLength={LIMITE_RELATO}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setErro("");
        }}
        aria-invalid={!!erro}
        aria-describedby={erro ? "relato-erro" : undefined}
      />
      {erro && <p id="relato-erro" role="alert" className="m-0 text-xs text-carimbo">{erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setEditando(false)} disabled={salvando} className="btn min-h-11 text-xs">
          CANCELAR
        </button>
        <button type="button" onClick={salvar} disabled={salvando || !texto.trim() || texto.trim() === relato} className="btn btn-pri min-h-11 text-xs">
          {salvando ? "SALVANDO…" : "SALVAR RELATO"}
        </button>
      </div>
      <p className="m-0 text-[11px] leading-snug opacity-75">A alteração fica registrada no histórico. O diagnóstico só pode ser alterado pela equipe.</p>
    </div>
  );
}
