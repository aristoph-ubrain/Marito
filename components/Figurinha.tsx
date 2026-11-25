import { RETRATOS } from "./retratos";

export type OpcaoFoto = 1 | 2 | 3 | 4 | 5 | 6;
export const OPCOES_FOTO: OpcaoFoto[] = [1, 2, 3, 4, 5, 6];
export const ehOpcaoFoto = (v: unknown): v is OpcaoFoto => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 6;

/** Tema de cada figurinha (4–6 pensadas para as classes futuras). */
export const TEMA_FOTO: Record<OpcaoFoto, string | null> = { 1: null, 2: null, 3: null, 4: "Invocador", 5: "Ocultista", 6: "Possuído" };

const DESCRICAO: Record<OpcaoFoto, string> = {
  1: "homem de óculos e barba, olhar fixo",
  2: "mulher pálida de cabelo ruivo molhado, olhos arregalados",
  3: "mulher de franja preta e olhos escuros, com um vulto atrás",
  4: "homem idoso olhando para cima, com rostos de espíritos ao redor",
  5: "mulher de óculos redondos com símbolos na pele e um círculo de giz atrás",
  6: "pessoa de cabeça inclinada, olho leitoso e sorriso largo demais",
};

/**
 * Figurinha de foto do prontuário. Desenhada em 340×460 e reduzida por escala,
 * então fica igual em qualquer tamanho. `prefixo` deve ser único na página.
 */
export function Figurinha({
  opcao,
  prontuario,
  largura = 116,
  giro = 2,
  carimbo = true,
  prefixo,
}: {
  opcao: OpcaoFoto;
  prontuario?: string;
  largura?: number;
  giro?: number;
  carimbo?: boolean;
  prefixo: string;
}) {
  const k = largura / 340;
  // O conteúdo do SVG é nosso (gerado do canvas), sem dados do usuário.
  const svg = RETRATOS[opcao].replaceAll("__P__", prefixo.replace(/[^a-zA-Z0-9_-]/g, ""));
  return (
    <div
      role="img"
      aria-label={`Foto do prontuário${prontuario ? ` ${prontuario}` : ""}: ${DESCRICAO[opcao]}`}
      className="flex-none"
      style={{ width: largura, height: Math.round(460 * k), transform: `rotate(${giro}deg)` }}
    >
      <div
        className="relative flex flex-col gap-2.5 overflow-hidden"
        style={{
          width: 340,
          height: 460,
          boxSizing: "border-box",
          background: "#fbf9f3",
          borderRadius: 22,
          padding: 14,
          boxShadow: "0 10px 24px rgba(0,0,0,.45)",
          transform: `scale(${k})`,
          transformOrigin: "top left",
        }}
      >
        <div aria-hidden="true" style={{ width: 312, height: 372, borderRadius: 12, overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="flex items-center justify-between px-1" aria-hidden="true">
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] tracking-[1px]">PRONT.</span>
            <b className="font-maquina text-[26px] font-normal">{prontuario ?? "0000"}</b>
          </div>
          {carimbo && (
            <span className="px-[7px] py-0.5 font-maquina text-xs tracking-[1.5px] text-carimbo" style={{ border: "2px solid var(--color-carimbo)", transform: "rotate(-5deg)" }}>
              ANÔMALO
            </span>
          )}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ borderRadius: 22, background: "linear-gradient(125deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 38%)" }} />
      </div>
    </div>
  );
}

/** Foto da ficha: a figurinha escolhida, ou o 3×4 vazio enquanto não houver escolha. */
export function FotoProntuario({ opcao, prontuario, largura = 116, prefixo }: { opcao?: OpcaoFoto | null; prontuario: string; largura?: number; prefixo: string }) {
  if (opcao) return <Figurinha opcao={opcao} prontuario={prontuario} largura={largura} prefixo={prefixo} />;
  return (
    <div className="relative shrink-0 bg-[#f8f5ec] p-1.5 pb-[18px] shadow-[0_2px_6px_rgba(0,0,0,.3)]" style={{ width: largura * 0.9, transform: "rotate(2deg)" }}>
      <div className="flex items-end justify-center overflow-hidden bg-[#cfc8b8]" style={{ height: largura * 0.98 }}>
        <svg width={largura * 0.66} height={largura * 0.8} viewBox="0 0 70 84" aria-hidden="true" fill="#9d9584">
          <circle cx="35" cy="30" r="17" />
          <path d="M4 84c2-20 15-30 31-30s29 10 31 30z" />
        </svg>
      </div>
      <span className="absolute inset-x-0 bottom-0.5 text-center text-[9px] tracking-[1px]">SEM FOTO</span>
    </div>
  );
}
