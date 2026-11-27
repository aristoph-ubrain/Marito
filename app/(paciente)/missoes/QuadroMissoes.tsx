"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Anotacao, BarraXp, Rodape, Titulo } from "@/components/ui";
import type { Missao } from "@/lib/atributos";
import { dois, duracaoTexto, milhar, mmss, PONTOS_POR_NIVEL, xpParaProximoNivel } from "@/lib/regras";
import { duracaoComHabilidade, resumoHabilidades, TAMANHO_FILA, xpComHabilidade, type Valores } from "@/lib/habilidades";
import { enfileirarMissao, iniciarMissao, interromperMissao, lerPaginaNova, removerDaFila, sincronizar } from "../actions";
import Link from "next/link";
import { semMarcas } from "@/lib/diario-base";
import { FolhaAberta } from "../diario/DiarioEncontrado";

type Filtro = "todas" | "liberadas" | "bloqueadas" | "andamento";
const FILTROS: [Filtro, string][] = [
  ["todas", "TODAS"],
  ["liberadas", "LIBERADAS"],
  ["bloqueadas", "BLOQUEADAS"],
  ["andamento", "EM ANDAMENTO"],
];

type EmCurso = { codigo: string; inicio: number; duracao: number };
type PaginaNova = { n: number; area: string; os: string | null; data: string; texto: string; outra: boolean };

export function QuadroMissoes({
  prontuario,
  agoraServidor,
  missoes,
  nivel,
  xp,
  feitasHoje,
  concluidas,
  alasFechadas,
  atributos,
  filaAtiva,
  repetirAtivo,
  fila,
  paginaNova,
  emCurso,
}: {
  prontuario: string;
  agoraServidor: number;
  missoes: Missao[];
  nivel: number;
  xp: number;
  feitasHoje: number;
  concluidas: Record<string, number>;
  alasFechadas: string[];
  atributos: Valores;
  filaAtiva: boolean;
  repetirAtivo: boolean;
  fila: { codigo: string; titulo: string }[];
  paginaNova: PaginaNova | null;
  emCurso: EmCurso | null;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [prog, setProg] = useState({ codigo: "", p: 0 });
  const [erro, setErro] = useState("");
  const [ocupado, iniciar] = useTransition();
  // Aviso de página do diário: some ao ler ou em DEPOIS (a página continua no Diário).
  const [dispensada, setDispensada] = useState<number | null>(null);
  const [lendo, setLendo] = useState<PaginaNova | null>(null);
  const achado = paginaNova && paginaNova.n !== dispensada ? paginaNova : null;
  const guardarPagina = (ler: boolean) => {
    if (!achado) return;
    setDispensada(achado.n);
    if (ler) setLendo(achado);
    void lerPaginaNova();
  };

  // Feedback de XP e nível: compara com os valores da renderização anterior (padrão "estado anterior" do React).
  const [anterior, setAnterior] = useState({ nivel, xp });
  const [aviso, setAviso] = useState<{ chave: string; texto: string; nivel: boolean } | null>(null);
  if (anterior.nivel !== nivel || anterior.xp !== xp) {
    setAnterior({ nivel, xp });
    if (nivel > anterior.nivel) setAviso({ chave: `n${nivel}`, texto: `NÍVEL ${dois(nivel)} · +${PONTOS_POR_NIVEL * (nivel - anterior.nivel)} PONTOS`, nivel: true });
    else if (xp > anterior.xp) setAviso({ chave: `x${nivel}-${xp}`, texto: `+${milhar(xp - anterior.xp)} XP`, nivel: false });
  }

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
  const podeEnfileirar = filaAtiva && emCurso !== null && fila.length < TAMANHO_FILA;
  const hab = resumoHabilidades(atributos);
  const total = xpParaProximoNivel(nivel);

  const lista = missoes
    .map((m) => {
      const alaFechada = alasFechadas.includes(m.local);
      const ok = !alaFechada && nivel >= m.nivel;
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
          Atividades internas liberadas conforme o nível do paciente e o acesso à ala. Uma atividade por vez, sem limite diário.
          A atividade continua mesmo com o sistema fechado. Duração e recompensa já contam as suas habilidades.
        </p>
        <div className="relative flex flex-col gap-2 border-2 border-tinta px-3 py-2.5">
          {aviso && !aviso.nivel && (
            <span key={aviso.chave} role="status" className="anim-ganho absolute -top-3 right-3 bg-papel px-1 font-maquina text-base text-verde">{aviso.texto}</span>
          )}
          <div className="flex justify-between text-[13px]">
            <span><b>Pront. {prontuario}</b> · Nv. {dois(nivel)}</span>
            <span>{milhar(xp)} / {milhar(total)} XP</span>
          </div>
          <BarraXp atual={xp} total={total} />
          {aviso?.nivel && (
            <span key={aviso.chave} role="status" className="anim-carimbo self-start border-[2.5px] border-verde px-2 py-0.5 font-maquina text-sm tracking-[2px] text-verde"
              style={{ transform: "rotate(-3deg)", ["--giro" as string]: "-3deg" }}>{aviso.texto}</span>
          )}
          <div className="flex justify-between border-t border-dashed border-tinta pt-1.5 text-xs">
            <span>MISSÕES HOJE: <b>{feitasHoje}</b></span>
            <span>Reinicia à meia-noite</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 border-t border-dashed border-tinta pt-1.5 text-xs">
            <span>Habilidades: <b>{hab.duracao}</b> duração · <b>{hab.xp.split(" ")[0]}</b> XP</span>
            <span>Repetir: <b>{repetirAtivo ? "LIGADO" : "DESLIGADO"}</b></span>
          </div>
        </div>
        {achado && (
          <div role="status" key={achado.n} className="anim-desdobra relative flex flex-col gap-1.5 px-3 pt-2.5 pb-3 shadow-[0_4px_10px_rgba(0,0,0,.35)]"
            style={{
              background: "#efe1bd",
              backgroundImage: "repeating-linear-gradient(180deg,transparent 0 23px,rgba(44,74,138,.16) 23px 24px)",
              transform: "rotate(-1.5deg)",
              ["--giro" as string]: "-1.5deg",
            }}>
            <span aria-hidden="true" className="absolute top-0 right-0 h-[22px] w-[22px]" style={{ background: "linear-gradient(225deg,var(--color-papel) 50%,rgba(0,0,0,.16) 50%)" }} />
            <div className="flex items-baseline justify-between gap-2 pr-5">
              <b className="font-maquina text-[15px] font-normal tracking-[.5px]">PÁGINA ENCONTRADA</b>
              <span className="text-[11px]">Pág. {dois(achado.n)} / 12</span>
            </div>
            <span className="text-xs leading-snug">
              Entre os papéis {achado.os ? <>da <b>{achado.os}</b> </> : "de uma ordem "}({achado.area}) havia uma folha arrancada de um diário.
            </span>
            <span className={`opacity-85 ${achado.outra ? "font-outra text-[13px] leading-relaxed text-[#3b2a2a]" : "font-mao text-[19px] leading-tight text-[#22325e]"}`}>
              “{semMarcas(achado.texto).split(/\s+/).slice(0, 6).join(" ")}…”
            </span>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn min-h-10" onClick={() => guardarPagina(false)}>DEPOIS</button>
              <button type="button" className="btn btn-escuro min-h-10" onClick={() => guardarPagina(true)} aria-haspopup="dialog">LER PÁGINA</button>
            </div>
          </div>
        )}
        {filaAtiva && (
          <div className="flex flex-col gap-1.5 border-[1.5px] border-dashed border-tinta px-3 py-2 text-xs">
            <b className="tracking-[.5px]">FILA DE ORDENS ({fila.length}/{TAMANHO_FILA})</b>
            {fila.length === 0 && <span className="opacity-75">Vazia. Com uma atividade em andamento, use PÔR NA FILA.</span>}
            {fila.map((f, i) => (
              <div key={`${f.codigo}-${i}`} className="flex items-center gap-2 border-t border-dashed border-tinta/50 pt-1.5">
                <span className="flex-1">{i + 1}. {f.codigo} · {f.titulo}</span>
                <button type="button" className="btn min-h-8 px-2 text-[11px]" disabled={ocupado} onClick={() => executar(() => removerDaFila(i))}
                  aria-label={`Tirar ${f.codigo} da fila`}>TIRAR</button>
              </div>
            ))}
          </div>
        )}
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

      <div className="anim-cascata flex flex-col gap-3.5" key={filtro}>
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
                <span className="anim-carimbo whitespace-nowrap px-1.5 py-0.5 font-maquina text-[11px] tracking-[1px]"
                  style={{ border: `2px solid ${cor}`, color: cor, transform: "rotate(-5deg)", ["--giro" as string]: "-5deg" }}>
                  {ok ? "LIBERADA" : "ACESSO NEGADO"}
                </span>
              </div>
              {m.descricao && <p className="m-0 text-xs leading-snug opacity-90">{m.descricao}</p>}
              <div className="flex flex-wrap gap-1.5">
                <span className={`border-[1.5px] px-1.5 py-0.5 text-xs ${nivel >= m.nivel ? "border-tinta" : "border-dashed border-carimbo text-carimbo"}`}>
                  NÍVEL {dois(m.nivel)} {nivel >= m.nivel ? "✓" : `· você ${dois(nivel)}`}
                </span>
                {alaFechada && <span className="border-[1.5px] border-dashed border-carimbo px-1.5 py-0.5 text-xs text-carimbo">ALA SEM ACESSO</span>}
              </div>
              <div className="flex justify-between border-t border-dashed border-tinta pt-1.5 text-[13px]">
                <span><b>Recompensa:</b> {m.xp == null ? "+??? XP" : `+${xpComHabilidade(m.xp, m.duracao, atributos)} XP`}</span>
                <span>Duração {duracaoTexto(duracaoComHabilidade(m.duracao, atributos))}</span>
              </div>

              {rodando && emCurso && (
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 border-[1.5px] border-verde p-0.5">
                    <div className="h-full bg-verde transition-[width] duration-200 ease-linear" style={{ width: `${Math.round(progresso * 100)}%` }} />
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
                  {podeEnfileirar ? (
                    <button type="button" className="btn px-3 text-sm tracking-[1px]" disabled={ocupado}
                      onClick={() => executar(() => enfileirarMissao(m.codigo))}>
                      PÔR NA FILA
                    </button>
                  ) : (
                    <button type="button" className="btn btn-pri px-4 text-sm tracking-[1px]" disabled={bloqueadoGeral}
                      onClick={() => executar(() => iniciarMissao(m.codigo))}>
                      INICIAR
                    </button>
                  )}
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

      {lendo && (
        <FolhaAberta
          pagina={{
            n: lendo.n,
            aberta: true,
            data: lendo.data,
            texto: lendo.texto,
            outra: lendo.outra,
            onde: `Encontrada em: ${lendo.area}${lendo.os ? ` · entre os papéis da ${lendo.os}` : ""}`,
          }}
          fechar={() => setLendo(null)}
          navegar={false}
          rodape={
            <div className="flex gap-2">
              <Link href="/diario" className="btn flex-1 no-underline">VER DIÁRIO →</Link>
              <button type="button" className="btn flex-1" onClick={() => setLendo(null)}>GUARDAR</button>
            </div>
          }
        />
      )}

      <Rodape>
        Ordens emitidas pela coordenação. Atividades fora desta lista não devem ser realizadas, mesmo quando solicitadas por funcionários.
      </Rodape>
    </>
  );
}
