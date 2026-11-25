"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Figurinha } from "@/components/Figurinha";
import { Anotacao, Carimbo, Censura, Foto3x4, GradeAtributos, Rodape, Titulo } from "@/components/ui";
import { ATRIBUTOS } from "@/lib/atributos";
import type { Colega, Pedido } from "@/lib/convivio";
import { responderConvivio, solicitarConvivio } from "../actions";

export function Convivio({
  meuProntuario,
  amigos,
  recebidos,
  enviados,
  bilhetesNaoLidos,
}: {
  meuProntuario: string;
  bilhetesNaoLidos: number;
  amigos: Colega[];
  recebidos: Pedido[];
  enviados: string[];
}) {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const solicitar = (e: React.FormEvent) => {
    e.preventDefault();
    const n = numero.trim();
    if (!/^\d{4}$/.test(n)) return setMsg({ texto: "Informe os 4 dígitos do prontuário.", ok: false });
    iniciar(async () => {
      const r = await solicitarConvivio(n);
      setMsg(r.ok ? { texto: r.msg ?? "Solicitação enviada.", ok: true } : { texto: r.erro, ok: false });
      if (r.ok) setNumero("");
      router.refresh();
    });
  };

  const responder = (de: string, aceitar: boolean) =>
    iniciar(async () => {
      const r = await responderConvivio(de, aceitar);
      if (!r.ok) setMsg({ texto: r.erro, ok: false });
      router.refresh();
    });

  const c = aberto ? amigos.find((a) => a.prontuario === aberto) : undefined;
  if (c) {
    return (
      <>
        <button type="button" className="btn self-start" onClick={() => setAberto(null)}>← VOLTAR AO CONVÍVIO</button>
        <div className="flex items-end justify-between border-b border-tinta pb-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] tracking-[1px]">FICHA DE OUTRO PACIENTE · CONSULTA</span>
            <span className="font-maquina text-[26px] leading-none">Nº {c.prontuario}</span>
          </div>
          <span className="text-[11px]">{c.ala}</span>
        </div>
        <section className="flex items-start gap-3.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm leading-snug">
            <div><b>Nome:</b> {c.nome}</div>
            <div><b>Classificação:</b> ANÔMALO</div>
            <div><b>Nível:</b> {c.nivel}</div>
            <div><b>Situação:</b> {c.situacao}</div>
          </div>
          {c.foto ? <Figurinha opcao={c.foto} prontuario={c.prontuario} largura={104} giro={-2} prefixo={`col${c.prontuario}`} /> : <Foto3x4 largura={90} giro={-2} />}
        </section>
        <section className="flex flex-col gap-2">
          <Titulo>ATRIBUTOS</Titulo>
          <GradeAtributos itens={ATRIBUTOS.map((a, i) => ({ sigla: a.sigla, valor: c.atributos[i] ?? 0 }))} />
        </section>
        <section className="flex flex-col gap-2 text-[13px] leading-snug">
          <Titulo>HISTÓRICO CLÍNICO</Titulo>
          <div><Censura>diagnóstico confidencial</Censura></div>
          <div><Censura>medicação e relatos do paciente</Censura> <Censura>restritos</Censura></div>
          <Carimbo giro={-3} tamanho={13}>SIGILO MÉDICO</Carimbo>
        </section>
        {c.prontuario === "0112" && <Anotacao>O quarto 112 está vazio desde 1998.</Anotacao>}
      </>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>VI. CONVÍVIO</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Pacientes autorizados a manter contato. O vínculo vale assim que o outro paciente aceitar.
        </p>
        <form onSubmit={solicitar} className="flex flex-col gap-2 border-2 border-tinta p-3">
          <label htmlFor="pront" className="rotulo">ADICIONAR PACIENTE · Nº DO PRONTUÁRIO</label>
          <div className="flex gap-2">
            <input id="pront" inputMode="numeric" maxLength={4} placeholder="0000" value={numero}
              onChange={(e) => { setNumero(e.target.value.replace(/\D/g, "").slice(0, 4)); setMsg(null); }}
              className="campo min-w-0 flex-1 text-xl tracking-[4px]" />
            <button type="submit" className="btn btn-pri" disabled={ocupado}>SOLICITAR</button>
          </div>
          {msg && <p role="status" className={`m-0 text-xs ${msg.ok ? "text-verde" : "text-carimbo"}`}>{msg.texto}</p>}
          <span className="text-[11px] opacity-70">Seu prontuário: {meuProntuario}</span>
        </form>
        <Link href="/convivio/bilhetes" className="flex min-h-12 items-center justify-between gap-2.5 border-[1.5px] border-tinta bg-[#f8f2e2] px-3 text-[13px] text-tinta no-underline">
          <span>
            ✉ BILHETES
            {bilhetesNaoLidos > 0 && (
              <span className="ml-1.5 border-[1.5px] border-carimbo px-1.5 text-[10px] tracking-[1px] text-carimbo">
                {bilhetesNaoLidos} NÃO LIDO{bilhetesNaoLidos > 1 ? "S" : ""}
              </span>
            )}
          </span>
          <b aria-hidden="true">→</b>
        </Link>
      </section>

      {recebidos.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="text-xs tracking-[.5px]"><b>SOLICITAÇÕES RECEBIDAS</b> ({recebidos.length})</span>
          {recebidos.map((r) => (
            <div key={r.prontuario} className="flex flex-col gap-2 border-[1.5px] border-dashed border-tinta bg-papel-claro p-3">
              <div className="text-[11px]">PRONT. {r.prontuario}</div>
              <span className="font-maquina text-[17px]">{r.nome}</span>
              {r.nota && <span className="text-xs opacity-85">{r.nota}</span>}
              <div className="flex gap-2">
                <button type="button" className="btn flex-1" disabled={ocupado} onClick={() => responder(r.prontuario, false)}>RECUSAR</button>
                <button type="button" className="btn btn-pri flex-1" disabled={ocupado} onClick={() => responder(r.prontuario, true)}>ACEITAR</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {enviados.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <span className="text-xs tracking-[.5px]"><b>SOLICITAÇÕES ENVIADAS</b></span>
          {enviados.map((id) => (
            <div key={id} className="flex justify-between border-t border-dashed border-tinta pt-1.5 text-xs">
              <span>Pront. {id}</span><span className="opacity-75">aguardando resposta</span>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <span className="text-xs tracking-[.5px]"><b>PACIENTES NO CONVÍVIO</b> ({amigos.length})</span>
        {amigos.length === 0 && <p className="m-0 text-xs opacity-70">Nenhum vínculo registrado.</p>}
        {amigos.map((a) => (
          <div key={a.prontuario} className="flex flex-col gap-2 border-[1.5px] border-tinta bg-papel-claro p-3">
            <div className="flex justify-between border-b border-dashed border-tinta pb-1.5 text-[11px]"><span>PRONT. {a.prontuario}</span><span>{a.ala}</span></div>
            <div className="flex items-center gap-2.5">
              {a.foto ? <Figurinha opcao={a.foto} largura={52} giro={0} carimbo={false} prefixo={`am${a.prontuario}`} /> : <Foto3x4 largura={44} giro={0} />}
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="font-maquina text-[17px]">{a.nome}</span>
                <span className="text-xs">ANÔMALO · Nv. {a.nivel}</span>
                <span className="text-xs" style={{ color: a.cor }}>● {a.situacao}</span>
              </div>
            </div>
            <button type="button" className="btn self-end" onClick={() => setAberto(a.prontuario)}>VER FICHA →</button>
          </div>
        ))}
      </section>

      <Anotacao>O 0112 me adicionou de novo. Eu recusei ontem.</Anotacao>
      <Rodape>Contato entre pacientes sujeito a revisão. Encontros fora dos horários permitidos devem ser relatados.</Rodape>
    </>
  );
}
