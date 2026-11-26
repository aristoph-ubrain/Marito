"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buscarMensagens, enviarComoCoordenacao, enviarMensagem } from "@/app/chat-actions";
import type { MensagemVista } from "@/lib/chat";

const LIMITE = 200;
const INTERVALO_MS = 3000;

const COR: Record<MensagemVista["tipo"], string> = {
  paciente: "var(--color-tinta)",
  coordenacao: "var(--color-verde)",
  sistema: "var(--color-tinta)",
  fantasma: "var(--color-carimbo)",
};

/** Canal geral: "nome: mensagem". Busca mensagens novas a cada 3 s. */
export function ChatGeral({
  iniciais,
  modo,
  nomeEnvio,
}: {
  iniciais: MensagemVista[];
  modo: "paciente" | "coordenacao";
  nomeEnvio: string;
}) {
  const [msgs, setMsgs] = useState(iniciais);
  const [texto, setTexto] = useState("");
  const [comoSistema, setComoSistema] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, iniciar] = useTransition();
  const ultimo = useRef(iniciais.at(-1)?.em ?? 0);

  const juntar = (novas: MensagemVista[]) => {
    if (!novas.length) return;
    setMsgs((atual) => {
      const ids = new Set(atual.map((m) => m.id));
      const somadas = [...atual, ...novas.filter((m) => !ids.has(m.id))];
      // Remove o que passou de 24 h enquanto a tela ficou aberta.
      const limite = Date.now() - 24 * 60 * 60 * 1000;
      return somadas.filter((m) => m.em > limite).slice(-300);
    });
    ultimo.current = Math.max(ultimo.current, ...novas.map((m) => m.em));
  };

  useEffect(() => {
    let ativo = true;
    const id = setInterval(() => {
      if (document.hidden) return; // economiza enquanto a aba está escondida
      buscarMensagens(ultimo.current)
        .then((novas) => { if (ativo) juntar(novas); })
        .catch(() => undefined); // rede falhou: tenta de novo no próximo ciclo
    }, INTERVALO_MS);
    return () => { ativo = false; clearInterval(id); };
  }, []);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setErro("");
    iniciar(async () => {
      const r = modo === "paciente" ? await enviarMensagem(t) : await enviarComoCoordenacao(t, comoSistema);
      if (!r.ok) return setErro(r.erro);
      setTexto("");
      juntar(await buscarMensagens(ultimo.current));
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        role="log"
        aria-live="polite"
        aria-label="Mensagens do canal geral"
        className="flex h-[52vh] min-h-[320px] flex-col-reverse overflow-y-auto border-[1.5px] border-tinta"
        style={{ backgroundColor: "#efe2c2", backgroundImage: "repeating-linear-gradient(#efe2c2 0 25px,#cfbf98 25px 26px)", backgroundPosition: "0 6px" }}
      >
        <div className="flex flex-col px-2.5 pt-1 pb-1.5">
          {msgs.length === 0 && <p className="m-0 text-xs leading-[26px] opacity-60">— Nenhuma mensagem nas últimas 24 horas.</p>}
          {msgs.map((m) =>
            m.tipo === "sistema" ? (
              <p key={m.id} className="anim-entra m-0 text-xs leading-[26px] italic opacity-70">— {m.texto}</p>
            ) : (
              <p key={m.id} className="anim-entra m-0 text-sm leading-[26px]" style={{ color: m.minha ? "var(--color-caneta)" : COR[m.tipo] }}>
                <span className="text-[11px] opacity-60">{m.hora} </span>
                <b>{m.autor}:</b> {m.texto}
              </p>
            ),
          )}
        </div>
      </div>

      <form onSubmit={enviar} className="m-0 flex flex-col gap-1">
        <label htmlFor="msg" className="flex justify-between text-[10px] tracking-[.5px]">
          <span>
            MENSAGEM COMO <b>{modo === "coordenacao" && comoSistema ? "SISTEMA" : nomeEnvio.toUpperCase()}</b>
          </span>
          <span>{texto.length}/{LIMITE}</span>
        </label>
        <div className="flex gap-1.5">
          <input
            id="msg"
            className="campo min-w-0 flex-1"
            value={texto}
            maxLength={LIMITE}
            autoComplete="off"
            placeholder="Escreva uma mensagem…"
            onChange={(e) => { setTexto(e.target.value.slice(0, LIMITE)); setErro(""); }}
          />
          <button type="submit" className="btn btn-pri tracking-[1px]" disabled={!texto.trim() || enviando}>ENVIAR</button>
        </div>
        {modo === "coordenacao" && (
          <label className="mt-1 flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={comoSistema} onChange={(e) => setComoSistema(e.target.checked)} className="m-0 h-5 w-5 accent-verde" />
            Enviar como aviso do sistema (sem nome, em itálico)
          </label>
        )}
        {erro && <p role="alert" className="m-0 text-xs text-carimbo">{erro}</p>}
      </form>
    </div>
  );
}
