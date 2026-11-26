"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Figurinha } from "@/components/Figurinha";
import { Anotacao, Carimbo, Censura, Foto3x4, GradeAtributos, Rodape, Titulo } from "@/components/ui";
import { ATRIBUTOS } from "@/lib/atributos";
import type { Colega, EstadoVinculo, PacientePublico, Pedido, Sugestao } from "@/lib/convivio";
import { buscarConvivio, dispensar, responderConvivio, solicitarConvivio } from "../actions";

export function Convivio({
  meuProntuario,
  amigos,
  recebidos,
  enviados,
  bilhetesNaoLidos,
  sugestoes,
}: {
  meuProntuario: string;
  bilhetesNaoLidos: number;
  sugestoes: Sugestao[];
  amigos: Colega[];
  recebidos: Pedido[];
  enviados: string[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<{ termo: string; lista: (PacientePublico & { estado: EstadoVinculo })[] } | null>(null);
  const [buscando, iniciarBusca] = useTransition();

  // Busca com pequena espera enquanto o jogador digita.
  useEffect(() => {
    const t = busca.trim();
    if (t.length < 2) return;
    const id = setTimeout(() => {
      iniciarBusca(async () => setResultados({ termo: t, lista: await buscarConvivio(t) }));
    }, 300);
    return () => clearTimeout(id);
  }, [busca]);
  const lista = busca.trim().length >= 2 && resultados?.termo === busca.trim() ? resultados.lista : null;
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const pedir = (n: string) =>
    iniciar(async () => {
      const r = await solicitarConvivio(n);
      setMsg(r.ok ? { texto: r.msg ?? "Solicitação enviada.", ok: true } : { texto: r.erro, ok: false });
      if (r.ok && resultados) setResultados({ ...resultados, lista: resultados.lista.map((p) => (p.prontuario === n ? { ...p, estado: "enviado" } : p)) });
      router.refresh();
    });

  const tirarSugestao = (n: string) =>
    iniciar(async () => {
      await dispensar(n);
      router.refresh();
    });

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
            <div><b>Classificação:</b> <span className="font-maquina tracking-[1px]" style={{ color: c.classeCor }}>{c.classe}</span></div>
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
        <div className="flex flex-col gap-2 border-2 border-tinta p-3">
          <label htmlFor="busca" className="rotulo">BUSCAR PACIENTE · NOME OU Nº DO PRONTUÁRIO</label>
          <input id="busca" type="search" autoComplete="off" placeholder="Ex.: Marta ou 0140" maxLength={40} value={busca}
            onChange={(e) => { setBusca(e.target.value); setMsg(null); }} className="campo text-base" aria-describedby="busca-ajuda" />
          {busca.trim().length >= 2 && (
            <div role="list" aria-label="Resultados da busca" aria-busy={buscando} className="flex flex-col gap-1.5">
              {!lista ? (
                <p className="m-0 text-xs opacity-70">Consultando o registro…</p>
              ) : lista.length === 0 ? (
                <p className="m-0 text-xs opacity-75">Nenhum paciente encontrado com “{busca.trim()}”.</p>
              ) : (
                lista.map((p) => (
                  <div key={p.prontuario} role="listitem" className="flex items-center gap-2.5 border-t border-dashed border-tinta pt-1.5">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-maquina text-[15px]">{p.nome}</span>
                      <span className="text-[11px] opacity-80">Pront. {p.prontuario} · {p.area} · Nv. {p.nivel}</span>
                    </div>
                    {p.estado === "livre" ? (
                      <button type="button" className="btn btn-pri min-h-10 px-2.5 text-xs" disabled={ocupado} onClick={() => pedir(p.prontuario)}>SOLICITAR</button>
                    ) : (
                      <span className="text-right text-[11px] opacity-75">
                        {p.estado === "amigo" ? "já no convívio" : p.estado === "enviado" ? "aguardando resposta" : "pediu convívio a você"}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          {msg && <p role="status" className={`m-0 text-xs ${msg.ok ? "text-verde" : "text-carimbo"}`}>{msg.texto}</p>}
          <span id="busca-ajuda" className="text-[11px] opacity-70">Seu prontuário: {meuProntuario} · A busca mostra só nome, área e nível.</span>
        </div>
        <Link href="/convivio/bilhetes" className="flex min-h-12 items-center justify-between gap-2.5 border-[1.5px] border-tinta bg-[#efe1bd] px-3 text-[13px] text-tinta no-underline">
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

      {sugestoes.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="text-xs tracking-[.5px]"><b>SUGESTÕES DE CONVÍVIO</b></span>
          {sugestoes.map((g) => (
            <div key={g.prontuario} className="flex items-center gap-2.5 border-[1.5px] border-tinta bg-papel-claro p-2.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-maquina text-[15px]">{g.nome}</span>
                <span className="text-[11px] opacity-80">Pront. {g.prontuario} · {g.area} · Nv. {g.nivel}</span>
                <span className={`text-[11px] ${g.estranha ? "text-carimbo" : "text-verde"}`}>{g.motivo}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button type="button" className="btn btn-pri min-h-10 px-2.5 text-xs" disabled={ocupado} onClick={() => pedir(g.prontuario)}>SOLICITAR</button>
                <button type="button" className="min-h-8 cursor-pointer border-0 bg-transparent p-0 text-[11px] text-tinta underline" disabled={ocupado}
                  onClick={() => tirarSugestao(g.prontuario)} aria-label={`Dispensar a sugestão ${g.nome}`}>dispensar</button>
              </div>
            </div>
          ))}
        </section>
      )}

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
                <span className="text-xs"><span style={{ color: a.classeCor }}>{a.classe}</span> · Nv. {a.nivel}</span>
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
