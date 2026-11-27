"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Anotacao, Titulo } from "@/components/ui";
import { AREA_FIXA, CHANCE_PAGINA, LIMITE_TEXTO_PAGINA, semMarcas, ULTIMA, type Pagina } from "@/lib/diario-base";
import { dois } from "@/lib/regras";
import { restaurarPagina, salvarPagina } from "./actions";

type PaginaEditor = Pagina & { editada: boolean; achadaPor: number };

export function EditorDiario({
  paginas,
  originais,
  areas,
  comPaginas,
  completos,
}: {
  paginas: PaginaEditor[];
  originais: Pagina[];
  areas: string[];
  comPaginas: number;
  completos: number;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<number | null>(null);
  const [rasc, setRasc] = useState<Pagina | null>(null);
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [ocupado, iniciar] = useTransition();

  const abrir = (p: PaginaEditor) => {
    setMsg(null);
    if (sel === p.n) {
      setSel(null);
      return setRasc(null);
    }
    setSel(p.n);
    setRasc({ n: p.n, data: p.data, area: p.area, texto: p.texto, outra: p.outra });
  };
  const mudar = (o: Partial<Pagina>) => setRasc((r) => (r ? { ...r, ...o } : r));

  const executar = (acao: () => Promise<{ ok: true; msg: string } | { ok: false; erro: string }>, depois?: () => void) =>
    iniciar(async () => {
      const r = await acao();
      setMsg(r.ok ? { texto: r.msg, ok: true } : { texto: r.erro, ok: false });
      if (r.ok) {
        depois?.();
        router.refresh();
      }
    });

  return (
    <>
      <section className="flex flex-col gap-2">
        <Titulo>DIÁRIO DA ENFERMEIRA C.</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Texto das 12 páginas e da última entrada. Os pacientes acham as páginas ao concluir ordens ({CHANCE_PAGINA * 100}% de chance por
          ordem, na área da página). Editar aqui muda o texto para todos, inclusive quem já achou.
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-[1.5px] border-tinta px-2.5 py-2 text-xs">
          <span>Pacientes com páginas: <b>{dois(comPaginas)}</b></span>
          <span>Diário completo: <b>{dois(completos)}</b></span>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        {paginas.map((p) => {
          const aberto = sel === p.n && rasc;
          const fim = p.n === ULTIMA;
          const fixa = AREA_FIXA[p.n];
          return (
            <div key={p.n} className="flex flex-col">
              <button type="button" aria-expanded={!!aberto} onClick={() => abrir(p)}
                className={`flex min-h-14 w-full items-center gap-2.5 border-[1.5px] border-tinta px-3 py-2.5 text-left ${aberto ? "bg-tinta text-papel" : "bg-papel-claro"}`}>
                <b className="min-w-8 font-maquina text-base font-normal">{fim ? "✕" : dois(p.n)}</b>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px]">{semMarcas(p.texto).split("\n")[0]}</span>
                  <span className="text-[11px] opacity-80">
                    {fim ? "ÚLTIMA ENTRADA" : p.area} · {p.data} · achada por {dois(p.achadaPor)}{p.editada ? " · EDITADA" : ""}
                  </span>
                </span>
                <span aria-hidden="true">{aberto ? "▾" : "▸"}</span>
              </button>

              {aberto && rasc && (
                <div className="flex flex-col gap-3 border-[1.5px] border-t-0 border-tinta bg-papel-campo p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`dt-${p.n}`} className="rotulo">DATA ESCRITA</label>
                      <input id={`dt-${p.n}`} className="campo" maxLength={20} value={rasc.data} onChange={(e) => mudar({ data: e.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`ar-${p.n}`} className="rotulo">ÁREA ONDE SE ACHA</label>
                      <select id={`ar-${p.n}`} className="campo" value={fixa ?? rasc.area} disabled={!!fixa} onChange={(e) => mudar({ area: e.target.value })}>
                        {fixa ? <option value={fixa}>{fixa}</option> : areas.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`tx-${p.n}`} className="rotulo">TEXTO DA PÁGINA · {rasc.texto.length}/{LIMITE_TEXTO_PAGINA}</label>
                    <textarea id={`tx-${p.n}`} className="campo bg-white" rows={6} maxLength={LIMITE_TEXTO_PAGINA} value={rasc.texto}
                      onChange={(e) => mudar({ texto: e.target.value })} />
                    <span className="text-[11px] opacity-75">Use [tarja]texto[/tarja] para riscar com tarja preta. Quebra de linha vira parágrafo.</span>
                  </div>
                  <label className="flex min-h-11 items-center gap-2.5 text-[13px]">
                    <input type="checkbox" className="h-[22px] w-[22px]" checked={rasc.outra} onChange={(e) => mudar({ outra: e.target.checked })} />
                    Letra de outra pessoa
                  </label>
                  <div className="flex flex-col gap-1.5 border border-dashed border-tinta p-2.5"
                    style={{ background: "#efe1bd", backgroundImage: "repeating-linear-gradient(180deg,transparent 0 25px,rgba(44,74,138,.16) 25px 26px)" }}>
                    <span className="rotulo">PRÉVIA · {fim ? "ÚLTIMA ENTRADA" : `PÁG. ${dois(p.n)}`} · {rasc.data}</span>
                    <p className={`m-0 whitespace-pre-line ${rasc.outra ? "font-outra text-[13px] leading-[1.9] text-[#3b2a2a]" : "font-mao text-xl leading-tight text-[#22325e]"}`}>
                      {semMarcas(rasc.texto)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn flex-1" disabled={ocupado}
                      onClick={() => {
                        const o = originais.find((x) => x.n === p.n);
                        if (!o) return;
                        if (p.editada) executar(() => restaurarPagina(p.n), () => setRasc({ ...o }));
                        else setRasc({ ...o });
                      }}>TEXTO ORIGINAL</button>
                    <button type="button" className="btn btn-pri flex-[2]" disabled={ocupado || !rasc.texto.trim()}
                      onClick={() => executar(() => salvarPagina(rasc))}>{ocupado ? "SALVANDO…" : "SALVAR PÁGINA"}</button>
                  </div>
                  <span className="text-[11px] leading-snug opacity-75">
                    {fim
                      ? "Última entrada: lacrada até o paciente juntar as 12 páginas. Área fixa."
                      : fixa
                        ? "Esta página só é achada na Ala Zero (nível 8). Área fixa."
                        : "Mudar a área muda onde os pacientes ainda podem achar esta página."}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {msg && <p role="status" className={`m-0 text-xs ${msg.ok ? "text-verde" : "text-carimbo"}`}>{msg.texto}</p>}
      <Anotacao>salvei a página 09 em branco. ela voltou escrita.</Anotacao>
      <p className="m-0 text-[11px] leading-snug opacity-75">
        O número de páginas, a ordem e a regra de achado são fixos. A última entrada só aparece para quem juntar as 12.
        TEXTO ORIGINAL desfaz a edição salva e volta ao texto do jogo.
      </p>
    </>
  );
}
