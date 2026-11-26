import type { CSSProperties, ReactNode } from "react";

/** Folha de prontuário sobre a mesa de madeira, com clipe. */
export function Papel({ children, faixa }: { children: ReactNode; faixa?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[560px] px-2.5 pt-3.5 pb-10">
      <div className="papel relative flex flex-col gap-5 pb-7">
        <div
          aria-hidden="true"
          className="absolute -top-2.5 right-8 h-[46px] w-4 rounded-[10px] border-[3px] border-clipe"
        />
        {faixa}
        <div className="flex flex-col gap-5 px-[18px] pt-[22px]">{children}</div>
      </div>
    </div>
  );
}

/** Selo do hospital. */
export function Selo({ tamanho = 44 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 44 44" aria-hidden="true" fill="none" stroke="#3a342a" strokeWidth="1.5">
      <circle cx="22" cy="22" r="20" />
      <circle cx="22" cy="22" r="15" strokeDasharray="2 2" />
      <path d="M22 12v20M14 22h16" />
    </svg>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  return <h2 className="anim-datilo m-0 font-maquina text-lg font-normal">{children}</h2>;
}

export function Carimbo({
  children,
  cor = "carimbo",
  giro = -4,
  tamanho = 15,
}: {
  children: ReactNode;
  cor?: "carimbo" | "verde";
  giro?: number;
  tamanho?: number;
}) {
  const c = cor === "verde" ? "var(--color-verde)" : "var(--color-carimbo)";
  return (
    <span
      className="anim-carimbo inline-block self-start whitespace-nowrap px-2.5 py-1 font-maquina tracking-[2px] opacity-90"
      style={{ border: `2.5px solid ${c}`, color: c, transform: `rotate(${giro}deg)`, fontSize: tamanho, ["--giro" as string]: `${giro}deg` }}
    >
      {children}
    </span>
  );
}

/** Anotação à caneta azul. */
export function Anotacao({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p className="anim-tremor m-0 font-mao text-[19px] text-caneta" style={{ transform: "rotate(-1.5deg)", ...style }}>
      {children}
    </p>
  );
}

export function Censura({ children }: { children: ReactNode }) {
  return <span className="censura">{children}</span>;
}

export function Foto3x4({ largura = 96, giro = 2 }: { largura?: number; giro?: number }) {
  return (
    <div className="shrink-0 bg-[#f8f5ec] p-1.5 pb-[18px] shadow-[0_2px_6px_rgba(0,0,0,.3)]" style={{ width: largura, transform: `rotate(${giro}deg)` }}>
      <div className="flex items-end justify-center overflow-hidden bg-[#cfc8b8]" style={{ height: largura * 1.08 }}>
        <svg width={largura * 0.73} height={largura * 0.87} viewBox="0 0 70 84" aria-hidden="true" fill="#9d9584">
          <circle cx="35" cy="30" r="17" />
          <path d="M4 84c2-20 15-30 31-30s29 10 31 30z" />
        </svg>
      </div>
    </div>
  );
}

/** Barra de XP datilografada. */
export function BarraXp({ atual, total }: { atual: number; total: number }) {
  const pct = Math.min(100, Math.round((atual / total) * 100));
  return (
    <div
      className="h-4 border-[1.5px] border-tinta p-0.5"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={atual}
      aria-label="Experiência no nível"
    >
      <div
        className="anim-barra h-full"
        style={{ width: `${pct}%`, background: "repeating-linear-gradient(90deg,#2b2620 0 6px,transparent 6px 8px)" }}
      />
    </div>
  );
}

/** Marcas de contagem: grupos de 5 (4 riscos + traço). `base` = registrado, `valor` = com pendentes. */
export function MarcasContagem({ base, valor }: { base: number; valor: number }) {
  if (valor === 0) return <span className="text-[11px] opacity-60">sem registro</span>;
  const grupos = [];
  for (let k = 0; k < valor; k += 5) {
    const n = Math.min(5, valor - k);
    const marca = (j: number) => <i key={j} className={k + j >= base ? "novo" : ""} />;
    grupos.push(
      n === 5 ? (
        <span key={k} className={`contagem cheio ${k + 4 >= base ? "cheio-novo" : ""}`}>
          {[0, 1, 2, 3].map(marca)}
        </span>
      ) : (
        <span key={k} className="contagem">
          {Array.from({ length: n }, (_, j) => marca(j))}
        </span>
      ),
    );
  }
  return (
    <span className="flex min-h-[18px] flex-wrap items-center gap-2.5" aria-hidden="true">
      {grupos}
    </span>
  );
}

/** Grade compacta com os 10 atributos. */
export function GradeAtributos({ itens }: { itens: { sigla: string; valor: number | string }[] }) {
  return (
    <div className="grid grid-cols-5 gap-1 text-center text-[11px]">
      {itens.map((a) => (
        <div key={a.sigla} className="flex flex-col border border-tinta/45 py-1">
          <span>{a.sigla}</span>
          <b className="text-sm">{typeof a.valor === "number" ? String(a.valor).padStart(2, "0") : a.valor}</b>
        </div>
      ))}
    </div>
  );
}

export function Rodape({ children }: { children: ReactNode }) {
  return <p className="m-0 text-[11px] leading-snug opacity-70">{children}</p>;
}
