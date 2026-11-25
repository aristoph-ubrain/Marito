import { Papel, Selo } from "@/components/ui";

export default function LayoutAcesso({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh pt-6 pb-28">
      <Papel>
        <header className="flex flex-col items-center gap-2 border-b-2 border-tinta pb-3.5 text-center">
          <Selo tamanho={58} />
          <div className="font-maquina text-[19px] leading-tight tracking-[.5px]">
            HOSPITAL DE SAÚDE
            <br />
            MENTAL MARITO
          </div>
          <div className="text-[11px] leading-snug tracking-[1px]">
            SISTEMA DE REGISTRO E
            <br />
            AVALIAÇÃO DE PACIENTES
          </div>
          <div className="text-[11px] tracking-[.5px]">
            STATUS: <b className="text-verde">● EM FUNCIONAMENTO</b>
          </div>
        </header>
        {children}
        <p className="m-0 border-t border-dashed border-tinta pt-2 text-[10px] leading-snug opacity-70">
          Acesso restrito a pacientes registrados e equipe autorizada. Este terminal é monitorado. SRAP v3.1 · 1998–2026
        </p>
      </Papel>
      <div aria-hidden="true"
        className="absolute right-5 bottom-5 w-[150px] rotate-[5deg] bg-[#e9d98a] px-2.5 pt-2.5 pb-3.5 font-mao text-lg leading-tight text-[#3b3320] shadow-[0_3px_8px_rgba(0,0,0,.4)]">
        não use seu nome verdadeiro
      </div>
    </div>
  );
}
