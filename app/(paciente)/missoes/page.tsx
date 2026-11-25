import { paciente as p, missoes } from "@/lib/mock";
import { QuadroMissoes } from "./QuadroMissoes";

export default function MissoesPage() {
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
