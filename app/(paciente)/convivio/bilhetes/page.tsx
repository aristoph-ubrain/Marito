import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { BILHETES_POR_DIA, enviadosHoje, listarBilhetes, marcarLidos } from "@/lib/bilhetes";
import { listarConvivio } from "@/lib/convivio";
import { pacienteAtual } from "@/lib/dal";
import { Bilhetes } from "./Bilhetes";

async function Pasta() {
  const p = await pacienteAtual();
  const [{ recebidos, enviados }, { amigos }, hoje] = await Promise.all([
    listarBilhetes(p.prontuario),
    listarConvivio(p.prontuario),
    enviadosHoje(p.prontuario),
  ]);
  // Lista primeiro (para mostrar o "NÃO LIDO"), depois marca como lidos.
  await marcarLidos(p.prontuario);
  return (
    <Bilhetes
      recebidos={recebidos}
      enviados={enviados}
      amigos={amigos.filter((a) => a.prontuario !== "0112").map((a) => ({ prontuario: a.prontuario, nome: a.nome, ala: a.ala }))}
      restam={Math.max(0, BILHETES_POR_DIA - hoje)}
    />
  );
}

export default function BilhetesPage() {
  return (
    <Suspense fallback={<Carregando texto="Abrindo a pasta de bilhetes…" />}>
      <Pasta />
    </Suspense>
  );
}
