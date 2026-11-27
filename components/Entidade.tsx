import { DESENHOS } from "@/lib/entidades-base";

/** Desenho de uma entidade (SVG 80×80 nosso). Sem `id`, mostra um "?". */
export function DesenhoEntidade({ id, tamanho = 52, className, style }: { id?: string | null; tamanho?: number; className?: string; style?: React.CSSProperties }) {
  const svg = id ? DESENHOS[id] : undefined;
  if (!svg)
    return (
      <svg width={tamanho} height={tamanho} viewBox="0 0 80 80" aria-hidden="true" className={className} style={style}>
        <text x="40" y="52" textAnchor="middle" fontSize="34" fill="#2b2620" opacity=".5" style={{ fontFamily: "var(--font-special-elite)" }}>?</text>
      </svg>
    );
  return <svg width={tamanho} height={tamanho} viewBox="0 0 80 80" aria-hidden="true" className={className} style={style} dangerouslySetInnerHTML={{ __html: svg }} />;
}
