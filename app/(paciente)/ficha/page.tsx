import Link from "next/link";
import { Anotacao, BarraXp, Carimbo, Censura, Foto3x4, GradeAtributos, Rodape, Titulo } from "@/components/ui";
import { ATRIBUTOS, paciente as p } from "@/lib/mock";
import { dois, milhar, xpParaProximoNivel } from "@/lib/regras";

export default function FichaPage() {
  const total = xpParaProximoNivel(p.nivel);
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
          Internação: ██/██/2026
        </span>
      </div>

      <section className="flex flex-col gap-2.5">
        <Titulo>I. IDENTIFICAÇÃO</Titulo>
        <div className="flex items-start gap-3.5">
          <div className="flex flex-1 flex-col gap-1 text-sm leading-snug">
            <div><b>Nome:</b> {p.nome}</div>
            <div className="flex gap-3.5"><span><b>Idade:</b> {p.idade}</span><span><b>Sexo:</b> {p.sexo}</span></div>
            <div><b>Altura:</b> {p.altura}</div>
            <div><b>Nac.:</b> {p.nacionalidade}</div>
            <div><b>Profissão:</b> {p.profissao}</div>
          </div>
          <Foto3x4 />
        </div>
        <Carimbo>CLASSE: {p.classe}</Carimbo>
      </section>

      <section className="flex flex-col gap-2 text-sm leading-snug">
        <Titulo>II. HISTÓRICO CLÍNICO</Titulo>
        <div><b>Diagnóstico:</b> {p.diagnostico}</div>
        <div><b>Medicação:</b> {p.medicacao}</div>
        <div><b>Alergias:</b> {p.alergias}</div>
        <div className="border-l-2 border-tinta pl-2.5 text-[13px]">
          {p.relato} <Censura>paciente descreve a ala</Censura> com precisão.
        </div>
      </section>

      <section className="flex flex-col gap-2 text-sm leading-snug">
        <Titulo>III. AVALIAÇÃO PSICOLÓGICA</Titulo>
        <div><b>Sintomas:</b> {p.sintomas}</div>
        <div><b>Gatilhos:</b> {p.gatilhos}</div>
      </section>

      <section className="flex flex-col gap-2.5">
        <Titulo>IV. SITUAÇÃO NO SISTEMA</Titulo>
        <div className="flex flex-col gap-2 border-2 border-tinta px-3 py-2.5">
          <div className="flex justify-between text-[13px]">
            <span><b>Nível</b> {dois(p.nivel)} · Anômalo</span>
            <span>{milhar(p.xp)} / {milhar(total)} XP</span>
          </div>
          <BarraXp atual={p.xp} total={total} />
          <GradeAtributos itens={ATRIBUTOS.map((a) => ({ sigla: a.sigla, valor: p.atributos[a.chave] }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Link href="/atributos" className="btn justify-between"><span>{p.pontos} pontos disponíveis</span><b>ATRIBUTOS →</b></Link>
          <Link href="/missoes" className="btn justify-between"><span>Nenhuma atividade em curso</span><b>MISSÕES →</b></Link>
          <Link href="/alas" className="btn justify-between"><span>Localização: {p.ala}</span><b>ALAS →</b></Link>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <Titulo>V. ANOTAÇÕES DA EQUIPE</Titulo>
        {p.anotacoes.map((a) => (
          <div key={a.data + a.autor} className={`border-t border-dashed border-tinta pt-2 text-[13px] leading-snug ${a.futuro ? "opacity-80" : ""}`}>
            <b>{a.data} · {a.autor}</b>
            <br />
            {a.texto}
          </div>
        ))}
        <Anotacao>Hoje é dia 25. Quem escreveu a de amanhã?</Anotacao>
      </section>

      <Rodape>Documento de uso interno. O paciente não deve ter acesso a este prontuário.</Rodape>
    </>
  );
}
