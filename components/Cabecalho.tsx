import { sair } from "@/app/(acesso)/actions";
import { Selo } from "./ui";
import { AvisosPaciente } from "./Avisos";
import { Navegacao } from "./Navegacao";

const LINKS_PACIENTE = [
  { href: "/ficha", rotulo: "FICHA" },
  { href: "/atributos", rotulo: "ATRIBUTOS" },
  { href: "/missoes", rotulo: "MISSÕES" },
  { href: "/alas", rotulo: "ALAS" },
  { href: "/convivio", rotulo: "CONVÍVIO" },
  { href: "/chat", rotulo: "CHAT" },
  { href: "/historico", rotulo: "HISTÓRICO" },
  { href: "/diario", rotulo: "DIÁRIO" },
];

export function CabecalhoPaciente() {
  return (
    <header className="flex flex-col gap-2.5 border-b-2 border-tinta pb-3">
      <div className="flex items-center gap-3">
        <Selo />
        <div className="flex flex-col gap-0.5">
          <div className="font-maquina text-[17px] leading-tight tracking-[.5px]">HOSPITAL DE SAÚDE MENTAL MARITO</div>
          <div className="text-[11px] tracking-[1px]">SISTEMA DE REGISTRO E AVALIAÇÃO DE PACIENTES</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tracking-[.5px]">
        <span>
          STATUS: <b className="text-verde">● EM FUNCIONAMENTO</b>
        </span>
        <AvisosPaciente />
        <form action={sair}>
          <button type="submit" className="min-h-8 cursor-pointer border-0 bg-transparent p-0 text-[11px] tracking-[.5px] text-tinta underline">
            SAIR
          </button>
        </form>
      </div>
      <Navegacao links={LINKS_PACIENTE} />
    </header>
  );
}
