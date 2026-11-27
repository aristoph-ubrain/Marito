"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { buscarAvisos, cienteAvisos } from "@/app/(paciente)/actions";
import type { Avisos as DadosAvisos, Aviso } from "@/lib/avisos";

const INTERVALO_MS = 20_000;
const ETIQUETA: Record<Aviso["tipo"], { rotulo: string; cor: string; acao: string }> = {
  convivio: { rotulo: "CONVÍVIO", cor: "var(--color-caneta)", acao: "RESPONDER" },
  chat: { rotulo: "CHAT", cor: "var(--color-tinta)", acao: "ABRIR" },
  area: { rotulo: "ÁREAS", cor: "var(--color-ocre)", acao: "PLANTA" },
  equipe: { rotulo: "EQUIPE", cor: "var(--color-carimbo)", acao: "VER" },
  classe: { rotulo: "CLASSIFICAÇÃO", cor: "var(--color-carimbo)", acao: "FICHA" },
  diario: { rotulo: "DIÁRIO", cor: "var(--color-caneta)", acao: "LER" },
};

/** Botão AVISOS no cabeçalho (todas as telas do paciente) e a folha "Enquanto você esteve fora". Atualiza sozinho. */
export function AvisosPaciente() {
  const caminho = usePathname();
  const [dados, setDados] = useState<DadosAvisos | null>(null);
  const [aberto, setAberto] = useState(false);
  const [salvando, iniciar] = useTransition();

  const carregar = useCallback(async () => {
    const d = await buscarAvisos();
    setDados(d);
    return d;
  }, []);

  // Lê ao abrir cada tela e a cada 20 s (só com a aba visível). Na primeira leitura da sessão do navegador,
  // abre a folha sozinho se houver novidade.
  useEffect(() => {
    let vivo = true;
    const primeira = setTimeout(() => {
      carregar().then((d) => {
        if (!vivo || !d?.itens.length) return;
        try {
          if (sessionStorage.getItem("avisos-abertos") === "1") return;
          sessionStorage.setItem("avisos-abertos", "1");
        } catch {
          /* sem sessionStorage: abre mesmo assim */
        }
        setAberto(true);
      });
    }, 0);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") carregar();
    }, INTERVALO_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") carregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      clearTimeout(primeira);
      clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [caminho, carregar]);

  const n = dados?.itens.length ?? 0;
  const ciente = () =>
    iniciar(async () => {
      await cienteAvisos();
      setAberto(false);
      await carregar();
    });

  return (
    <>
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-controls="folha-avisos"
        aria-label={n ? `Avisos: ${n} novos` : "Avisos: nenhum novo"}
        className="flex min-h-8 cursor-pointer items-center gap-1 border border-tinta bg-transparent px-2 text-[11px] tracking-[.5px] text-tinta">
        AVISOS
        {n > 0 && <b key={n} className="anim-carimbo rounded-full bg-carimbo px-1.5 text-[10px] text-[#f4efe2]">{n}</b>}
      </button>
      {aberto && dados && (
        <section id="folha-avisos" role="region" aria-label="Avisos" aria-live="polite"
          className="anim-desdobra order-last flex w-full flex-col gap-2.5 border-[1.5px] border-tinta bg-papel-claro p-3.5 shadow-[3px_3px_0_rgba(43,38,32,.25)]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] tracking-[1.5px]">AVISO INTERNO</span>
              <h2 className="m-0 font-maquina text-lg font-normal">ENQUANTO VOCÊ ESTEVE FORA</h2>
              <span className="text-[11px] opacity-80">Desde {dados.desde}</span>
            </div>
            {n > 0 && (
              <span className="rotate-6 whitespace-nowrap border-2 border-carimbo px-1.5 py-0.5 font-maquina text-[11px] tracking-[1.5px] text-carimbo">{n} NOVO{n > 1 ? "S" : ""}</span>
            )}
          </div>
          {n === 0 && <p className="m-0 border-t border-dashed border-tinta pt-2 text-xs opacity-80">Nenhum aviso novo.</p>}
          {dados.itens.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 border-t border-dashed border-tinta pt-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="self-start border px-1.5 text-[10px] tracking-[.5px]" style={{ borderColor: ETIQUETA[a.tipo].cor, color: ETIQUETA[a.tipo].cor }}>{ETIQUETA[a.tipo].rotulo}</span>
                <span className="text-[13px] leading-snug">{a.texto}</span>
                {a.detalhe && <span className="text-[11px] opacity-75">{a.detalhe}</span>}
              </div>
              <Link href={a.href} onClick={() => setAberto(false)} className="btn min-h-9 whitespace-nowrap px-2.5 text-[11px]">{ETIQUETA[a.tipo].acao} →</Link>
            </div>
          ))}
          {dados.linha0317 && (
            <p className="m-0 border-t border-tinta pt-2 text-xs leading-snug text-carimbo">
              {dados.linha0317} <span className="censura">Por você.</span>
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn min-h-11 flex-1" onClick={() => setAberto(false)}>FECHAR</button>
            <button type="button" className="btn btn-pri min-h-11 flex-[1.4]" disabled={salvando || n === 0} onClick={ciente}>{salvando ? "ARQUIVANDO…" : "CIENTE"}</button>
          </div>
          <span className="text-[10px] leading-snug opacity-70">CIENTE arquiva os avisos. O que aconteceu continua no Histórico.</span>
        </section>
      )}
    </>
  );
}
