import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { alaAcessivel, listarAlas } from "@/lib/alas";
import { pacienteAtual } from "@/lib/dal";
import { listarMissoesPublicadas } from "@/lib/ordens";
import { PlantaAlas } from "./PlantaAlas";
import { revelaAlaZero } from "@/lib/habilidades";

/** Nome da ala secreta se revela letra a letra a partir do nível 6 (mascarado no servidor). */
function nomeSecreto(nome: string, nivel: number) {
  const n = Math.max(0, nivel - 5);
  return nome.slice(0, 4) + nome.slice(4).split("").map((c, i) => (i < n ? c : "█")).join("");
}

async function Planta() {
  const p = await pacienteAtual();
  const [alas, missoes] = await Promise.all([listarAlas(), listarMissoesPublicadas()]);
  const porAla = (nome: string) => missoes.filter((m) => m.local === nome).length;
  // Vínculo 10: a ala sem registro aparece inteira na planta, mesmo antes do nível exigido (o acesso continua pelo nível).
  const ve = revelaAlaZero(p.atributos);
  return (
    <PlantaAlas
      nivel={p.nivel}
      alaAtualId={alas.find((a) => a.nome === p.local)?.id ?? "D"}
      visitadasIds={alas.filter((a) => p.alasVisitadas.includes(a.nome)).map((a) => a.id)}
      alas={alas.map((a) => ({
        id: a.id,
        nome: a.secreta && !ve ? nomeSecreto(a.nome, p.nivel) : a.nome,
        sub: a.sub,
        nivel: a.secreta && !ve && !alaAcessivel(a, p.nivel) ? 0 : a.nivel,
        interditada: a.situacao === "interditada",
        secreta: !!a.secreta,
        ocorrencias: a.secreta && !alaAcessivel(a, p.nivel) ? ["Registro inexistente."] : a.ocorrencias,
        missoes: a.secreta ? "?" : porAla(a.nome),
      }))}
    />
  );
}

export default function AlasPage() {
  return (
    <Suspense fallback={<Carregando texto="Abrindo a planta…" />}>
      <Planta />
    </Suspense>
  );
}
