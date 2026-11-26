import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { naoLidos } from "@/lib/bilhetes";
import { listarConvivio, sugerirConvivio } from "@/lib/convivio";
import { pacienteAtual } from "@/lib/dal";
import { Convivio } from "./Convivio";

async function Lista() {
  const p = await pacienteAtual();
  const [{ amigos, recebidos, enviados }, bilhetes, sugestoes] = await Promise.all([
    listarConvivio(p.prontuario),
    naoLidos(p.prontuario),
    sugerirConvivio(p.prontuario),
  ]);
  return <Convivio meuProntuario={p.prontuario} amigos={amigos} recebidos={recebidos} enviados={enviados} bilhetesNaoLidos={bilhetes} sugestoes={sugestoes} />;
}

export default function ConvivioPage() {
  return (
    <Suspense fallback={<Carregando texto="Consultando o convívio…" />}>
      <Lista />
    </Suspense>
  );
}
