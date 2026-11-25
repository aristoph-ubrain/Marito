import { Suspense } from "react";
import { connection } from "next/server";
import { paciente as p } from "@/lib/mock";
import { listarMissoesPublicadas } from "@/lib/ordens";
import { QuadroMissoes } from "./QuadroMissoes";

async function Quadro() {
  await connection();
  const missoes = await listarMissoesPublicadas();
  return (
    <QuadroMissoes
      missoes={missoes}
      atributos={p.atributos}
      nivel={p.nivel}
      xpInicial={p.xp}
      feitasHoje={p.missoesHoje}
    />
  );
}

export default function MissoesPage() {
  return (
    <Suspense fallback={<p className="text-xs">Consultando o quadro…</p>}>
      <Quadro />
    </Suspense>
  );
}
