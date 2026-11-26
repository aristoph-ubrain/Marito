/** Remonta a cada navegação: a tela nova entra com uma transição curta (ver docs/prompt-animacoes.md). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="anim-tela flex flex-col gap-5">{children}</div>;
}
