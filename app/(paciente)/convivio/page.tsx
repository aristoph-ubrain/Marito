import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { listarConvivio } from "@/lib/convivio";
import { pacienteAtual } from "@/lib/dal";
import { Convivio } from "./Convivio";

async function Lista() {
  const p = await pacienteAtual();
  const { amigos, recebidos, enviados } = await listarConvivio(p.prontuario);
  return <Convivio meuProntuario={p.prontuario} amigos={amigos} recebidos={recebidos} enviados={enviados} />;
}

export default function ConvivioPage() {
  return (
    <Suspense fallback={<Carregando texto="Consultando o convívio…" />}>
      <Lista />
    </Suspense>
  );
}
