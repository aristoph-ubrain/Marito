"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Anotacao, BarraXp, GradeAtributos, Rodape, Titulo } from "@/components/ui";
import { ATRIBUTOS, siglaDe, type ChaveAtributo, type Missao } from "@/lib/atributos";
import { atendeRequisitos, dois, duracaoTexto, milhar, mmss, xpParaProximoNivel } from "@/lib/regras";
import { iniciarMissao, interromperMissao, sincronizar } from "../actions";

type Filtro = "todas" | "liberadas" | "bloqueadas" | "andamento";
const FILTROS: [Filtro, string][] = [
  ["todas", "TODAS"],
  ["liberadas", "LIBERADAS"],
  ["bloqueadas", "BLOQUEADAS"],
  ["andamento", "EM ANDAMENTO"],
];

type EmCurso = { codigo: string; inicio: number; duracao: number };

export function QuadroMissoes({
  prontuario,
  agoraServidor,
  missoes,
  atributos,
  nivel,
  xp,
  feitasHoje,
  concluidas,
  alasFechadas,
  emCurso,
}: {
  prontuario: string;
  agoraServidor: number;
  missoes: Missao[];
  atributos: Record<ChaveAtributo, number>;
  nivel: number;
  xp: number;
  feitasHoje: number;
  concluidas: Record<string, number>;
  alasFechadas: string[];
  emCurso: EmCurso | null;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [prog, setProg] = useState({ codigo: "", p: 0 });
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();

  // Diferença entre o relógio do aparelho e o do servidor (corrige celulares com hora errada).
  const [desvio] = useState(() => agoraServidor - Date.now());
  const codigoEmCurso = emCurso?.codigo;
  const inicioEmCurso = emCurso?.inicio;
  const duracaoEmCurso = emCurso?.duracao;

  // Cronômetro só de exibição: quem decide se a missão terminou é o servidor (pelo horário de início).
  useEffect(() => {
    if (!codigoEmCurso || inicioEmCurso === undefined || duracaoEmCurso === undefined) return;
    let ativo = true;
    let espera: ReturnType<typeof setTimeout> | undefined;
    let tentativas = 0;
    const conferir = () => {
      sincronizar()
        .then((r) => {
          if (!ativo) return;
          if (r.ok && "restanteMs" in r && r.restanteMs) {
            espera = setTimeout(conferir, Math.max(500, r.restanteMs)); // o servidor diz que ainda falta
          } else {
            router.refresh();
          }
        })
        .catch(() => {
          if (!ativo) return;
          tentativas += 1;
          espera = setTimeout(conferir, Math.min(30000, 2000 * 2 ** tentativas)); // rede falhou: tenta de novo
        });
    };
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() + desvio - inicioEmCurso) / (duracaoEmCurso * 1000));
      setProg({ codigo: `${codigoEmCurso}@${inicioEmCurso}`, p });
      if (p >= 1) {
        clearInterval(id);
        conferir();
      }
    }, 250);
    return () => {
      ativo = false;
      clearInterval(id);
      if (espera) clearTimeout(espera);
    };
  }, [codigoEmCurso, inicioEmCurso, duracaoEmCurso, desvio, router]);

  const executar = (acao: () => Promise<{ ok: boolean; erro?: string }>) => {
    setErro("");
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro ?? "Falha na operação.");
      router.refresh();
    });
  };

  const progresso = emCurso && prog.codigo === `${emCurso.codigo}@${emCurso.inicio}` ? prog.p : 0;
  const bloqueadoGeral = emCurso !== null || ocupado;
  const total = xpParaProximoNivel(nivel);

  const lista = missoes
    .map((m) => {
      const alaFechada = alasFechadas.includes(m.local);
      const ok = !alaFechada && atendeRequisitos(atributos, m.requisitos);
      return { m, ok, alaFechada, rodando: emCurso?.codigo === m.codigo };
    })
    .filter(({ ok, rodando }) =>
      filtro === "todas" || (filtro === "liberadas" && ok) || (filtro === "bloqueadas" && !ok) || (filtro === "andamento" && rodando),
    );

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>IV. ORDENS DE ATIVIDADE</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Atividades internas liberadas conforme a avaliação de atributos do paciente. Uma atividade por vez, sem limite diário.
          A atividade continua mesmo com o sistema fechado.
        </p>
        <div className="flex flex-col gap-2 border-2 border-tinta px-3 py-2.5">
          <div className="flex justify-between text-[13px]">
            <span><b>Pront. {prontuario}</b> · Nv. {dois(nivel)}</span>
            <span>{milhar(xp)} / {milhar(total)} XP</span>
          </div>
          <BarraXp atual={xp} total={total} />
          <div className="flex justify-between border-t border-dashed border-tinta pt-1.5 text-xs">
            <span>MISSÕES HOJE: <b>{feitasHoje}</b></span>
            <span>Reinicia à meia-noite</span>
          </div>
          <GradeAtributos itens={ATRIBUTOS.map((a) => ({ sigla: a.sigla, valor: atributos[a.chave] }))} />
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar missões">
        {FILTROS.map(([f, rotulo]) => (
          <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f}
            className={`btn min-h-10 px-2 text-xs ${filtro === f ? "btn-escuro" : ""}`}>
            {rotulo}
          </button>
        ))}
      </div>

      {erro && <p role="alert" className="m-0 border border-dashed border-carimbo p-2 text-xs text-carimbo">{erro}</p>}

      <Anotacao>Ninguém autorizou a OS-019. Ela continua aparecendo.</Anotacao>

      <div className="flex flex-col gap-3.5">
        {lista.length === 0 && <p className="m-0 text-xs opacity-70">Nenhuma ordem nesta situação.</p>}
        {lista.map(({ m, ok, alaFechada, rodando }) => {
          const cor = ok ? "var(--color-verde)" : "var(--color-carimbo)";
          return (
            <article key={m.codigo} className={`flex flex-col gap-2 border-[1.5px] border-tinta p-3 ${ok ? "bg-papel-claro" : "bg-papel-escuro"}`}>
              <div className="flex justify-between border-b border-dashed border-tinta pb-1.5 text-[11px] tracking-[.5px]">
                <span>{m.codigo}</span>
                <span>{m.local}</span>
              </div>
              <div className="flex items-start gap-2">
                <h3 className="m-0 flex-1 font-maquina text-[17px] font-normal leading-tight">{m.titulo}</h3>
                <span className="whitespace-nowrap px-1.5 py-0.5 font-maquina text-[11px] tracking-[1px]"
                  style={{ border: `2px solid ${cor}`, color: cor, transform: "rotate(-5deg)" }}>
                  {ok ? "LIBERADA" : "ACESSO NEGADO"}
                </span>
              </div>
              {m.descricao && <p className="m-0 text-xs leading-snug opacity-90">{m.descricao}</p>}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] tracking-[.5px]">REQUISITOS</span>
                <div className="flex flex-wrap gap-1.5">
                  {m.requisitos.map((r) => {
                    const tem = atributos[r.atributo] ?? 0;
                    const atende = tem >= r.minimo;
                    return (
                      <span key={r.atributo}
                        className={`border-[1.5px] px-1.5 py-0.5 text-xs ${atende ? "border-tinta" : "border-dashed border-carimbo text-carimbo"}`}>
                        {siglaDe(r.atributo)} {dois(r.minimo)} {atende ? "✓" : `· você ${dois(tem)}`}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between border-t border-dashed border-tinta pt-1.5 text-[13px]">
                <span><b>Recompensa:</b> {m.xp == null ? "+??? XP" : `+${m.xp} XP`}</span>
                <span>Duração {duracaoTexto(m.duracao)}</span>
              </div>

              {rodando && emCurso && (
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 border-[1.5px] border-verde p-0.5">
                    <div className="h-full bg-verde" style={{ width: `${Math.round(progresso * 100)}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>{progresso >= 1 ? "CONCLUINDO…" : `EM ANDAMENTO · restam ${mmss((1 - progresso) * emCurso.duracao)}`}</span>
                    <button type="button" className="btn" disabled={ocupado || progresso >= 1} onClick={() => executar(interromperMissao)}>
                      INTERROMPER
                    </button>
                  </div>
                </div>
              )}
              {ok && !rodando && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] opacity-75">
                    {concluidas[m.codigo] ? `Concluída ${concluidas[m.codigo]}×` : "Nunca realizada"}
                  </span>
                  <button type="button" className="btn btn-pri px-4 text-sm tracking-[1px]" disabled={bloqueadoGeral}
                    onClick={() => executar(() => iniciarMissao(m.codigo))}>
                    INICIAR
                  </button>
                </div>
              )}
              {!ok && (
                <p className="m-0 text-xs text-carimbo">
                  {alaFechada ? `Acesso à ${m.local} ainda não autorizado.` : "Avaliação insuficiente. Distribua pontos em ATRIBUTOS."}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <Rodape>
        Ordens emitidas pela coordenação. Atividades fora desta lista não devem ser realizadas, mesmo quando solicitadas por funcionários.
      </Rodape>
    </>
  );
}
