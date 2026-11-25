import type { Metadata } from "next";
import Link from "next/link";
import { Anotacao, Censura, Papel, Selo } from "@/components/ui";
import { FOTO_FACHADA } from "./foto";

export const metadata: Metadata = { title: "Memorial — Sanatório Marito" };

const CRONOLOGIA: { ano: string; texto: React.ReactNode; sigilo?: boolean; apagado?: boolean }[] = [
  { ano: "1931", texto: <>Inaugurado o <b>Sanatório Marito</b>, fundado pelo Dr. Álvaro Marito para o tratamento de tuberculose. Três andares, quarenta leitos e uma escada de serviço que levava à casa de máquinas.</> },
  { ano: "1952", texto: <>Com o fim das grandes epidemias, o sanatório é convertido em <b>hospital psiquiátrico</b>. São construídas a Ala C e a capela. A casa de máquinas é lacrada e deixa de constar na planta.</> },
  { ano: "1974", texto: <>Início do <b>Programa de Avaliação Contínua</b>. Os internos passam a ter atributos medidos e registrados em fichas. Os primeiros pacientes classificados como <b>ANÔMALOS</b> são transferidos para <Censura>o andar de baixo</Censura>.</> },
  { ano: "1998", sigilo: true, texto: <><b>25 de novembro, 03:17.</b> Ocorrência no quarto 112 da Ala C. A ala é interditada na mesma noite. O registro oficial cita <Censura>um paciente</Censura> desaparecido; a contagem da manhã seguinte acusou um interno a mais. A planta é revisada e o quarto 112 é declarado vazio.</> },
  { ano: "2009", texto: <>A capela é desativada após relatos de velas acesas durante a madrugada. Ninguém da equipe assumiu tê-las acendido.</> },
  { ano: "2026", texto: <>Implantado o <b>Sistema de Registro e Avaliação de Pacientes (SRAP)</b>. Pela primeira vez desde 1998, o acesso à Ala C é liberado. Não há assinatura de funcionário na autorização.</> },
  { ano: "20██", apagado: true, texto: <>Transferência dos internos para a <Censura>ala zero</Censura>.</> },
];

const NORMAS = [
  "As luzes dos corredores ficam acesas durante toda a noite.",
  "Nenhum interno deve usar a escada de serviço.",
  "Batidas na parede do quarto 112 não devem ser respondidas.",
  "Às 03:17 o sistema realiza a contagem dos internos. Permaneça no leito.",
];

export default function MemorialPage() {
  return (
    <Papel>
      <span
        className="absolute top-5 right-3.5 rotate-[8deg] border-[2.5px] border-carimbo px-2 py-0.5 font-maquina text-xs tracking-[2px] text-carimbo opacity-80"
        aria-hidden="true"
      >
        ARQUIVO MORTO
      </span>

      <Link href="/login" className="self-start text-xs">← Voltar ao acesso</Link>

      <header className="flex flex-col items-center gap-1.5 border-b-2 border-tinta pb-3.5 text-center">
        <Selo tamanho={52} />
        <span className="text-[10px] tracking-[2px]">MEMORIAL DA INSTITUIÇÃO</span>
        <h1 className="m-0 font-maquina text-[22px] leading-tight font-normal">
          SANATÓRIO MARITO
          <br />
          <span className="text-[15px]">1931 — 2026</span>
        </h1>
        <span className="text-[11px] opacity-80">Documento de apresentação aos novos internos. Revisão nº 7.</span>
      </header>

      <figure className="m-0 flex w-full flex-col gap-2">
        <div className="-rotate-[1.5deg] bg-[#f6f1e3] px-2 pt-2 pb-2.5 shadow-[0_3px_8px_rgba(0,0,0,.35)]">
          {/* SVG nosso, sem dados do usuário. */}
          <div dangerouslySetInnerHTML={{ __html: FOTO_FACHADA }} />
        </div>
        <figcaption className="text-center text-[11px] leading-snug opacity-85">Fachada principal, inauguração, 1931. Fotógrafo desconhecido.</figcaption>
        <Anotacao style={{ fontSize: 18, textAlign: "right" }}>o prédio estava vazio no dia da foto. quem acendeu a luz?</Anotacao>
      </figure>

      <section className="flex flex-col gap-2 text-[13px] leading-relaxed">
        <h2 className="m-0 font-maquina text-[17px] font-normal">APRESENTAÇÃO</h2>
        <p className="m-0">
          O Hospital de Saúde Mental Marito nasceu como sanatório para doenças do pulmão, no alto de uma colina afastada da cidade.
          Ao longo de quase um século, mudou de função, de nome e de planta. Este documento resume sua história para que o interno
          compreenda a instituição que o recebe.
        </p>
        <p className="m-0">
          A direção agradece a colaboração de todos os que, de algum modo, <Censura>permaneceram</Censura> aqui.
        </p>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="m-0 font-maquina text-[17px] font-normal">CRONOLOGIA</h2>
        <ol className="m-0 ml-1.5 flex list-none flex-col border-l-2 border-tinta p-0 pt-0.5">
          {CRONOLOGIA.map((e) => (
            <li key={e.ano} className={`relative flex flex-col gap-1.5 pb-[18px] pl-[18px] ${e.apagado ? "opacity-55" : ""}`}>
              <span aria-hidden="true" className="absolute top-1.5 -left-1.5 h-2.5 w-2.5 rounded-full border-2 border-tinta bg-papel" />
              <span className="font-maquina text-[22px] leading-none">{e.ano}</span>
              <p className="m-0 text-[13px] leading-relaxed">{e.texto}</p>
              {e.sigilo && (
                <span className="-rotate-3 self-start border-2 border-carimbo px-[7px] py-0.5 font-maquina text-[11px] tracking-[1.5px] text-carimbo">
                  SIGILO · NÃO DIVULGAR
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-2 border-[1.5px] border-tinta p-3">
        <h2 className="m-0 font-maquina text-[15px] font-normal">NORMAS QUE PERMANECEM DESDE 1931</h2>
        <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[13px] leading-relaxed">
          {NORMAS.map((n) => <li key={n}>{n}</li>)}
        </ol>
      </section>

      <Anotacao>
        a contagem das 03:17 sempre dá um a mais.
        <br />
        eu contei três noites seguidas.
      </Anotacao>

      <footer className="flex items-end justify-between gap-2.5 border-t border-dashed border-tinta pt-2.5 text-[10px] leading-snug">
        <span>
          Arquivo da Diretoria · Pasta 03
          <br />
          Cópia nº <Censura>0112</Censura>
        </span>
        <span className="text-right">
          Proibida a retirada
          <br />
          deste documento da instituição
        </span>
      </footer>
    </Papel>
  );
}
