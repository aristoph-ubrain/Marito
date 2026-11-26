import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { Anotacao, BarraXp, Carimbo, GradeAtributos, Rodape, Titulo } from "@/components/ui";
import { FotoFicha } from "./SeletorFoto";
import { RelatoEditavel } from "./RelatoEditavel";
import { ATRIBUTOS } from "@/lib/atributos";
import { pacienteAtual } from "@/lib/dal";
import { revelaTarjas } from "@/lib/habilidades";
import { classePorNome } from "@/lib/classes";
import { dataCurta, dois, milhar, xpParaProximoNivel } from "@/lib/regras";

const SEXO = { M: "M", F: "F", O: "Outro" } as const;

async function Ficha() {
  const p = await pacienteAtual();
  const total = xpParaProximoNivel(p.nivel);
  const agora = new Date(); // a página já é dinâmica (lê a sessão)
  const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
  const semTarja = revelaTarjas(p.atributos); // Vínculo 15
  const [classe, anterior] = await Promise.all([classePorNome(p.classe), p.classeAnterior ? classePorNome(p.classeAnterior) : null]);
  const anotacoes = [...p.anotacoes].sort((a, b) => new Date(a.em).getTime() - new Date(b.em).getTime());

  return (
    <>
      <div className="flex items-end justify-between border-b border-tinta pb-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] tracking-[1px]">PRONTUÁRIO DO PACIENTE</span>
          <span className="font-maquina text-[26px] leading-none">Nº {p.prontuario}</span>
        </div>
        <span className="text-right text-[11px] leading-tight">
          Leito: {p.ala} · Q. {p.quarto}
          <br />
          Internação: {dataCurta(new Date(p.criadoEm))}
        </span>
      </div>

      <section className="flex flex-col gap-2.5">
        <Titulo>I. IDENTIFICAÇÃO</Titulo>
        <FotoFicha atual={p.foto ?? null} prontuario={p.prontuario} sugerida={classe.id ? classe.figurinha : null}>
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm leading-snug">
            <div><b>Nome:</b> {p.nome}</div>
            <div className="flex gap-3.5"><span><b>Idade:</b> {p.idade}</span><span><b>Sexo:</b> {SEXO[p.sexo] ?? p.sexo}</span></div>
            <div><b>Altura:</b> {p.altura || "—"}</div>
            <div><b>Nac.:</b> {p.nacionalidade || "—"}</div>
            <div><b>Profissão:</b> {p.profissao || "—"}</div>
          </div>
        </FotoFicha>
        {p.classeAnterior ? (
          <div className="relative self-start pt-1.5 pb-1 pl-1">
            <span className="relative block opacity-40" aria-hidden="true">
              <Carimbo cor={anterior?.cor}>CLASSE: {p.classeAnterior}</Carimbo>
              <span className="absolute top-1/2 right-0 left-0 h-0.5" style={{ background: anterior?.cor ?? "var(--color-carimbo)", transform: "rotate(-4deg)" }} />
            </span>
            <span className="sr-only">Classe anterior: {p.classeAnterior}. </span>
            <span className="absolute top-[22px] left-[34px] bg-papel/55">
              <Carimbo cor={classe.cor} giro={3}>CLASSE: {p.classe}</Carimbo>
            </span>
          </div>
        ) : (
          <Carimbo cor={classe.cor}>CLASSE: {p.classe}</Carimbo>
        )}
        {(p.classeEm || classe.descricao) && (
          <p className={`m-0 text-xs leading-snug ${p.classeAnterior ? "mt-4" : ""}`}>
            {p.classeEm && <b>Reclassificado em {dataCurta(new Date(p.classeEm))}. </b>}
            {classe.descricao}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2 text-sm leading-snug">
        <Titulo>II. HISTÓRICO CLÍNICO</Titulo>
        <div className="flex flex-col gap-0.5 border-2 border-carimbo bg-carimbo/[.07] px-2.5 py-2">
          <span className="text-[11px] tracking-[1.5px] text-carimbo">DIAGNÓSTICO · EQUIPE MÉDICA</span>
          <span className="font-maquina text-xl leading-tight">{p.diagnostico}</span>
        </div>
        <RelatoEditavel relato={p.relato ?? ""} />
      </section>

      <section className="flex flex-col gap-2.5">
        <Titulo>III. SITUAÇÃO NO SISTEMA</Titulo>
        <div className="flex flex-col gap-2 border-2 border-tinta px-3 py-2.5">
          <div className="flex justify-between text-[13px]">
            <span><b>Nível</b> {dois(p.nivel)} · {p.classe.charAt(0) + p.classe.slice(1).toLocaleLowerCase("pt-BR")}</span>
            <span>{milhar(p.xp)} / {milhar(total)} XP</span>
          </div>
          <BarraXp atual={p.xp} total={total} />
          <GradeAtributos itens={ATRIBUTOS.map((a) => ({ sigla: a.sigla, valor: p.atributos[a.chave] }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Link href="/atributos" className="btn w-full justify-between gap-3 py-2 text-left"><span className="min-w-0 flex-1 leading-snug [overflow-wrap:normal]">{p.pontos} pontos disponíveis</span><b className="shrink-0 whitespace-nowrap">ATRIBUTOS →</b></Link>
          <Link href="/missoes" className="btn w-full justify-between gap-3 py-2 text-left">
            <span className="min-w-0 flex-1 leading-snug [overflow-wrap:normal]">{p.emCurso ? `Em atividade: ${p.emCurso.codigo}` : "Nenhuma atividade em curso"}</span><b className="shrink-0 whitespace-nowrap">MISSÕES →</b>
          </Link>
          <Link href="/alas" className="btn w-full justify-between gap-3 py-2 text-left"><span className="min-w-0 flex-1 leading-snug [overflow-wrap:normal]">Localização: {p.local}</span><b className="shrink-0 whitespace-nowrap">ALAS →</b></Link>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <Titulo>IV. ANOTAÇÕES DA EQUIPE</Titulo>
        {anotacoes.map((a, i) => (
          <div key={i} className="border-t border-dashed border-tinta pt-2 text-[13px] leading-snug">
            <b>{dataCurta(new Date(a.em))} · {a.autor}</b>
            <br />
            {a.texto}
          </div>
        ))}
        <div className="border-t border-dashed border-tinta pt-2 text-[13px] leading-snug opacity-70">
          <b>{dataCurta(amanha)} · {semTarja ? "Diretoria" : "██████"}</b>
          <br />
          {semTarja ? "Paciente transferido para a Ala Zero. Leito já preparado. Família não será informada." : "Paciente transferido para Ala ██."}
        </div>
        <Anotacao>{semTarja ? "agora eu consigo ler o que estava riscado. preferia não conseguir." : "Essa última anotação é de amanhã."}</Anotacao>
      </section>

      <Rodape>Documento de uso interno. O paciente não deve ter acesso a este prontuário.</Rodape>
    </>
  );
}

export default function FichaPage() {
  return (
    <Suspense fallback={<Carregando texto="Abrindo o prontuário…" />}>
      <Ficha />
    </Suspense>
  );
}
