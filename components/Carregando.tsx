export function Carregando({ texto = "Consultando o arquivo…" }: { texto?: string }) {
  return (
    <p className="m-0 text-xs opacity-70" role="status">
      {texto}
    </p>
  );
}
