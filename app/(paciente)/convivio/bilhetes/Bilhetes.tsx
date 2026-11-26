"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Anotacao, Censura, Titulo } from "@/components/ui";
import type { BilheteVisto } from "@/lib/bilhetes";
import { escreverBilhete, rasgar } from "../../actions";

const LIMITE = 200;
const POR_DIA = 2;
const GIROS = [-1.2, 0.8, -0.5, 1.1];
type Aba = "rec" | "esc" | "env";
type Amigo = { prontuario: string; nome: string; ala: string };

/** Papel pautado com a ponta dobrada. */
function Papel({ fantasma, giro, rasgando, children }: { fantasma?: boolean; giro: number; rasgando?: boolean; children: React.ReactNode }) {
  return (
    <article
      className={`relative flex flex-col gap-2 px-3.5 pt-3 pb-3.5 shadow-[0_2px_6px_rgba(0,0,0,.28)] ${rasgando ? "anim-rasga" : "anim-desdobra"} ${fantasma ? "bg-[#ece3cd] grayscale-[.35]" : "bg-[#f8f2e2]"}`}
      style={{
        transform: `rotate(${giro}deg)`,
        backgroundImage: "repeating-linear-gradient(180deg,transparent 0 25px,rgba(44,74,138,.16) 25px 26px)",
      }}
    >
      <span aria-hidden="true" className="absolute top-0 right-0 h-[22px] w-[22px]" style={{ background: "linear-gradient(225deg,var(--color-papel) 50%,rgba(0,0,0,.14) 50%)" }} />
      {children}
    </article>
  );
}

export function Bilhetes({ recebidos, enviados, amigos, restam }: { recebidos: BilheteVisto[]; enviados: BilheteVisto[]; amigos: Amigo[]; restam: number }) {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("rec");
  const [para, setPara] = useState(amigos[0]?.prontuario ?? "");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [rasgando, setRasgando] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const novos = recebidos.filter((b) => !b.lido).length;

  const ir = (a: Aba) => {
    setAba(a);
    setErro("");
    setAviso("");
    setConfirmando(null);
  };

  const responder = (b: BilheteVisto) => {
    setPara(b.outro);
    ir("esc");
  };

  const enviar = () =>
    iniciar(async () => {
      const r = await escreverBilhete(para, texto);
      if (!r.ok) return setErro(r.erro);
      setTexto("");
      setAba("env");
      setAviso(r.msg ?? "Bilhete entregue.");
      router.refresh();
    });

  const rasgarBilhete = (id: string) => {
    setRasgando(id);
    iniciar(async () => {
      const r = await rasgar(id);
      setConfirmando(null);
      setRasgando(null);
      if (!r.ok) setErro(r.erro);
      router.refresh();
    });
  };

  const acoes = (b: BilheteVisto, podeResponder: boolean) =>
    confirmando === b.id ? (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span className="text-xs">Rasgar? Não dá para desfazer.</span>
        <button type="button" className="btn min-h-10 px-3 text-xs" onClick={() => setConfirmando(null)} disabled={ocupado}>NÃO</button>
        <button type="button" className="btn btn-perigo min-h-10 px-3 text-xs" onClick={() => rasgarBilhete(b.id)} disabled={ocupado}>RASGAR</button>
      </div>
    ) : (
      <div className="flex flex-wrap justify-end gap-1.5">
        {podeResponder && <button type="button" className="btn min-h-10 px-3 text-xs" onClick={() => responder(b)}>RESPONDER</button>}
        <button type="button" className="btn min-h-10 border-carimbo px-3 text-xs text-carimbo" onClick={() => setConfirmando(b.id)}>RASGAR</button>
      </div>
    );

  const quando = (b: BilheteVisto) => `${b.hoje ? "hoje" : "ontem"}, ${b.hora}`;

  return (
    <>
      <section className="flex flex-col gap-2">
        <Link href="/convivio" className="self-start text-xs">← Convívio</Link>
        <Titulo>VI-A. BILHETES</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Correspondência entre internos do mesmo convívio. Os bilhetes somem em 24 horas. A equipe não lê os bilhetes. <Censura>Ou lê.</Censura>
        </p>
      </section>

      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Seções dos bilhetes">
        {([["rec", `RECEBIDOS${novos ? ` (${novos})` : ""}`], ["esc", "ESCREVER"], ["env", "ENVIADOS"]] as [Aba, string][]).map(([a, r]) => (
          <button key={a} type="button" aria-pressed={aba === a} onClick={() => ir(a)} className={`btn min-h-[42px] px-1 text-xs ${aba === a ? "btn-escuro" : ""}`}>{r}</button>
        ))}
      </div>

      {erro && aba !== "esc" && <p role="alert" className="m-0 text-xs text-carimbo">{erro}</p>}
      {aviso && <p role="status" className="m-0 text-xs text-verde">{aviso}</p>}

      {aba === "rec" && (
        <div className="flex flex-col gap-4">
          {recebidos.length === 0 && <p className="m-0 text-xs opacity-70">Nenhum bilhete guardado.</p>}
          {recebidos.map((b, i) => (
            <Papel key={b.id} fantasma={b.fantasma} giro={GIROS[i % GIROS.length]} rasgando={rasgando === b.id}>
              <div className="flex justify-between gap-2 text-[11px]">
                <b>{b.fantasma ? "De: ██████████" : `De: Pront. ${b.outro} · ${b.nome}`}</b>
                <span>{quando(b)}</span>
              </div>
              <p className={`m-0 font-mao text-[21px] leading-tight [overflow-wrap:anywhere] ${b.fantasma ? "text-[#3a342a]" : "text-caneta"}`}>{b.texto}</p>
              <div className="flex items-center justify-between gap-2">
                {b.lido ? <span className="text-[11px] opacity-60">Lido</span> : <span className="border-[1.5px] border-carimbo px-1.5 font-maquina text-[10px] tracking-[1px] text-carimbo">NÃO LIDO</span>}
                {acoes(b, !b.fantasma)}
              </div>
              {b.fantasma && <span className="text-[11px] italic opacity-70">Remetente sem internação. Resposta indisponível.</span>}
            </Papel>
          ))}
        </div>
      )}

      {aba === "esc" && (
        <div className="flex flex-col gap-3">
          {amigos.length === 0 ? (
            <p className="m-0 text-xs leading-snug opacity-80">Você ainda não tem pacientes no convívio. <Link href="/convivio">Adicione alguém</Link> para escrever.</p>
          ) : (
            <>
              <span className="rotulo">PARA (SEU CONVÍVIO)</span>
              <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Destinatário">
                {amigos.map((a) => {
                  const on = para === a.prontuario;
                  return (
                    <button key={a.prontuario} type="button" role="radio" aria-checked={on} onClick={() => { setPara(a.prontuario); setErro(""); }}
                      className={`flex min-h-12 w-full items-center gap-2.5 border-[1.5px] border-tinta px-2.5 py-1.5 text-left ${on ? "bg-tinta text-papel" : "bg-papel-campo"}`}>
                      <b className="min-w-[42px] font-maquina text-[15px] font-normal">{a.prontuario}</b>
                      <span className="flex-1 text-sm">{a.nome}</span>
                      <span className="text-[11px] opacity-80">{a.ala}</span>
                    </button>
                  );
                })}
              </div>
              <label htmlFor="bilhete" className="rotulo">BILHETE · {texto.length}/{LIMITE}</label>
              <Papel giro={0}>
                <textarea id="bilhete" rows={5} maxLength={LIMITE} value={texto} placeholder="Escreva à mão…"
                  onChange={(e) => { setTexto(e.target.value); setErro(""); }}
                  aria-invalid={!!erro} aria-describedby={erro ? "bilhete-erro" : undefined}
                  className="w-full resize-none border-0 bg-transparent font-mao text-[21px] leading-[26px] text-caneta" />
              </Papel>
              {erro && <p id="bilhete-erro" role="alert" className="m-0 text-xs text-carimbo">{erro}</p>}
              <button type="button" className="btn btn-pri min-h-[50px] text-sm tracking-[1.5px]" onClick={enviar}
                disabled={ocupado || restam <= 0 || !texto.trim() || !para}>
                {ocupado ? "DOBRANDO…" : "DOBRAR E ENVIAR"}
              </button>
              <p className="m-0 text-[11px] leading-snug opacity-75">
                {restam} de {POR_DIA} bilhetes restantes hoje (renova à meia-noite) · até {LIMITE} caracteres · chega na hora · some em 24 horas.
                Rasgar tira o bilhete só da sua pasta.
              </p>
            </>
          )}
        </div>
      )}

      {aba === "env" && (
        <div className="flex flex-col gap-3.5">
          {enviados.length === 0 && <p className="m-0 text-xs opacity-70">Nenhum bilhete enviado.</p>}
          {enviados.map((b, i) => (
            <Papel key={b.id} giro={GIROS[(i + 1) % GIROS.length]} rasgando={rasgando === b.id}>
              <div className="flex justify-between gap-2 text-[11px]">
                <b>Para: Pront. {b.outro} · {b.nome}</b>
                <span>{quando(b)}</span>
              </div>
              <p className="m-0 font-mao text-[21px] leading-tight text-caneta [overflow-wrap:anywhere]">{b.texto}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] opacity-70">{b.lido ? "Entregue · lido" : "Entregue"}</span>
                {acoes(b, false)}
              </div>
            </Papel>
          ))}
        </div>
      )}

      <Anotacao>alguém dobrou meus bilhetes de um jeito<br />que eu não sei dobrar.</Anotacao>
    </>
  );
}
