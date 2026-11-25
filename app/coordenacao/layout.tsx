import Link from "next/link";
import { Navegacao } from "@/components/Navegacao";
import { Papel, Selo } from "@/components/ui";

const LINKS = [
  { href: "/coordenacao/missoes", rotulo: "MISSÕES" },
  { href: "/coordenacao/pacientes", rotulo: "PACIENTES" },
  { href: "/coordenacao/alas", rotulo: "ALAS" },
];

export default function LayoutCoordenacao({ children }: { children: React.ReactNode }) {
  return (
    <Papel
      faixa={
        <div className="flex justify-between bg-verde px-[18px] py-2 text-[11px] tracking-[1px] text-[#f4efe2]">
          <span>COORDENAÇÃO · ACESSO RESTRITO</span>
          <span>● ONLINE</span>
        </div>
      }
    >
      <header className="-mt-2 flex flex-col gap-2.5 border-b-2 border-tinta pb-3">
        <div className="flex items-center gap-3">
          <Selo />
          <div className="flex flex-1 flex-col gap-0.5">
            <div className="font-maquina text-[17px] leading-tight">PAINEL DA COORDENAÇÃO</div>
            <div className="text-[11px] tracking-[.5px]">Hospital de Saúde Mental Marito</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span>Dr. ██████ · Coordenador</span>
          <Link href="/login">SAIR</Link>
        </div>
        <Navegacao links={LINKS} grade rotulo="Navegação da coordenação" />
      </header>
      {children}
    </Papel>
  );
}
