"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Anotacao, Rodape, Titulo } from "@/components/ui";
import { TOTAL_PAGINAS, ULTIMA, trechos } from "@/lib/diario-base";
import { dois } from "@/lib/regras";
import { lerPaginaNova } from "../actions";

export type PaginaVista =
  | { n: number; aberta: true; data: string; texto: string; outra: boolean; onde: string }
  | { n: number; aberta: false; dica: string };

const RASGO = "polygon(0 0,100% 0,100% 88%,92% 92%,84% 88%,74% 94%,62% 89%,50% 95%,38% 90%,26% 96%,14% 90%,6% 94%,0 90%)";

export function DiarioEncontrado({ paginas, achadas, nova }: { paginas: PaginaVista[]; achadas: number; nova: { n: number; area: string } | null }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const [avisoNova, setAvisoNova] = useState(!!nova);
  const lidas = paginas.filter((p) => p.aberta).map((p) => p.n);
  const atual = paginas.find((p) => p.n === aberta && p.aberta) as Extract<PaginaVista, { aberta: true }> | undefined;
  const pos = atual ? lidas.indexOf(atual.n) : -1;

  const abrir = (n: number) => {
    setAberta(n);
    if (nova && n === nova.n && avisoNova) {
      setAvisoNova(false);
      void lerPaginaNova();
    }
  };

  return (
    <>
      {avisoNova && nova && (
        <div role="status" className="anim-entra flex items-center gap-2.5 border-2 border-verde bg-verde/[.08] px-3 py-2.5">
          <span className="font-maquina text-[26px] text-verde">+1</span>
          <span className="flex-1 text-xs leading-snug">
            <b>PÁGINA ENCONTRADA</b>
            <br />
            Pág. {dois(nova.n)} · {nova.area} · entre os papéis de uma ordem concluída.
          </span>
          <button type="button" className="btn min-h-9" onClick={() => abrir(nova.n)}>LER</button>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <Titulo>IX. DIÁRIO ENCONTRADO</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Páginas soltas achadas durante as atividades. A letra é de alguém da equipe de 1974. Cada área guarda páginas diferentes.
        </p>
        <div className="flex items-center gap-2.5">
          <div className="h-3 flex-1 border-[1.5px] border-tinta p-px" role="progressbar" aria-label="Páginas encontradas"
            aria-valuemin={0} aria-valuenow={achadas} aria-valuemax={TOTAL_PAGINAS}>
            <div className="h-full bg-[repeating-linear-gradient(90deg,var(--color-tinta)_0_5px,transparent_5px_7px)]" style={{ width: `${(achadas / TOTAL_PAGINAS) * 100}%` }} />
          </div>
          <span className="font-maquina text-lg">{dois(achadas)} / {TOTAL_PAGINAS}</span>
        </div>
      </section>

      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Páginas do diário">
        {paginas.map((p) => {
          const fim = p.n === ULTIMA;
          const rotulo = fim ? "✕" : dois(p.n);
          if (!p.aberta)
            return (
              <div key={p.n} aria-label={fim ? "Última entrada lacrada" : p.dica ? `Próxima página, ${p.n}. Está em: ${p.dica}` : `Página ${p.n} não encontrada`}
                className={`flex aspect-[3/4] flex-col justify-between border-[1.5px] border-dashed p-1.5 ${p.dica && !fim ? "border-verde text-verde opacity-90" : "opacity-55"} ${fim ? "border-carimbo text-carimbo" : p.dica ? "" : "border-tinta"}`}>
                <span className="font-maquina text-lg leading-none">{rotulo}</span>
                <span className="text-[9px] leading-tight tracking-[.5px]">{fim ? "LACRADA" : p.dica ? `PRÓXIMA · ${p.dica}` : "?"}</span>
              </div>
            );
          return (
            <button key={p.n} type="button" onClick={() => abrir(p.n)} aria-haspopup="dialog"
              aria-label={fim ? "Ler a última entrada" : `Ler a página ${p.n}, ${p.data}`}
              className={`flex aspect-[3/4] cursor-pointer flex-col justify-between border-[1.5px] bg-papel-claro p-1.5 text-left font-mono shadow-[0_2px_4px_rgba(60,40,15,.25)] ${fim ? "border-carimbo text-carimbo" : "border-tinta text-tinta"}`}
              style={{ clipPath: RASGO }}>
              <span className="font-maquina text-lg leading-none">{rotulo}</span>
              <span className="text-[9px] tracking-[.5px]">{fim ? "ÚLTIMA" : p.data.slice(0, 5)}</span>
            </button>
          );
        })}
      </div>
      <p className="m-0 text-[11px] leading-snug opacity-75">
        Toque numa página para lê-la. As páginas aparecem em ordem: só a próxima (em verde) pode ser achada, e só numa ordem da área
        indicada, com 1% de chance a cada conclusão.
      </p>
      {achadas < TOTAL_PAGINAS && (
        <p className="m-0 border-[1.5px] border-dashed border-carimbo px-3 py-2.5 text-xs leading-snug text-carimbo">
          ÚLTIMA ENTRADA · lacrada. Abre quando as {TOTAL_PAGINAS} páginas estiverem juntas.
        </p>
      )}

      <Anotacao>a letra muda na página 09. e a tinta da 12 ainda está molhada.</Anotacao>
      <Rodape>Material recolhido pela equipe. Objetos pessoais de funcionários devem ser entregues à Coordenação.</Rodape>

      {atual && (
        <FolhaAberta
          pagina={atual}
          fechar={() => setAberta(null)}
          anterior={pos > 0 ? () => setAberta(lidas[pos - 1]) : undefined}
          proxima={pos < lidas.length - 1 ? () => setAberta(lidas[pos + 1]) : undefined}
        />
      )}
    </>
  );
}

/** Página aberta por cima da tela, como um bilhete. Usada no Diário e no aviso das Missões. */
export function FolhaAberta({
  pagina,
  fechar,
  anterior,
  proxima,
  navegar = true,
  rodape,
}: {
  pagina: Extract<PaginaVista, { aberta: true }>;
  fechar: () => void;
  anterior?: () => void;
  proxima?: () => void;
  navegar?: boolean; // mostra ANTERIOR / PRÓXIMA
  rodape?: React.ReactNode;
}) {
  const fecharRef = useRef<HTMLButtonElement>(null);
  // Guarda a função de fechar num ref: a tela de Missões re-renderiza a cada 250 ms (cronômetro),
  // e o efeito abaixo (foco e Esc) deve rodar só ao abrir.
  const aoFechar = useRef(fechar);
  useEffect(() => {
    aoFechar.current = fechar;
  }, [fechar]);
  useEffect(() => {
    fecharRef.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar.current();
    };
    document.addEventListener("keydown", tecla);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = rolagem;
    };
  }, []);

  const fim = pagina.n === ULTIMA;
  // Portal no body: o papel da página tem animação com transform, que prenderia o "fixed" dentro dele.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={fim ? "Última entrada do diário" : `Página ${pagina.n} do diário`}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(30,22,14,.62)] px-3.5 pt-24 pb-10"
      onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <article key={pagina.n} className="anim-desdobra relative flex w-full max-w-[380px] flex-col gap-2.5 p-4 pt-3.5 shadow-[0_10px_28px_rgba(0,0,0,.55)]"
        style={{
          background: pagina.outra ? "#e3d3ad" : "#efe1bd",
          backgroundImage: "repeating-linear-gradient(180deg,transparent 0 25px,rgba(44,74,138,.16) 25px 26px)",
          transform: "rotate(-1.2deg)",
          ["--giro" as string]: "-1.2deg",
        }}>
        <span aria-hidden="true" className="absolute top-0 right-0 h-[26px] w-[26px]" style={{ background: "linear-gradient(225deg,#3a2c1f 50%,rgba(0,0,0,.18) 50%)" }} />
        <button ref={fecharRef} type="button" onClick={fechar} aria-label="Fechar página"
          className="absolute -top-3.5 -left-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-tinta bg-papel text-lg text-tinta shadow-[0_2px_6px_rgba(0,0,0,.4)]">✕</button>
        <div className="flex justify-between pl-7 text-[11px] tracking-[.5px]">
          <b>{fim ? "ÚLTIMA ENTRADA" : `PÁG. ${dois(pagina.n)}`}</b>
          <span>{pagina.data}</span>
        </div>
        <p className={`m-0 whitespace-pre-line ${pagina.outra ? "font-outra text-[15px] leading-[26px] text-[#3b2a2a]" : "font-mao text-[22px] leading-[26px] text-[#22325e]"}`}>
          {trechos(pagina.texto).map((t, i) =>
            t.tarja ? <span key={i} className="censura">{t.t}</span> : <span key={i}>{t.t}</span>,
          )}
        </p>
        <div className="border-t border-dashed border-tinta pt-1.5 text-[11px] opacity-80">{pagina.onde}</div>
        {navegar && (
          <div className="flex gap-2">
            <button type="button" className="btn flex-1" disabled={!anterior} onClick={anterior}>← ANTERIOR</button>
            <button type="button" className="btn flex-1" disabled={!proxima} onClick={proxima}>PRÓXIMA →</button>
          </div>
        )}
        {rodape ?? <button type="button" className="btn" onClick={fechar}>GUARDAR NO DIÁRIO</button>}
      </article>
    </div>,
    document.body,
  );
}
