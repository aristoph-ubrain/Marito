import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { ATRIBUTOS } from "@/lib/atributos";
import { coordenadorAtual } from "@/lib/dal";
import { colecaoPacientes, normalizar } from "@/lib/pacientes";
import { dataCurta } from "@/lib/regras";
import { GestaoPacientes } from "./GestaoPacientes";

async function Lista() {
  await coordenadorAtual();
  const docs = await (await colecaoPacientes())
    .find({}, { projection: { _id: 0, senhaHash: 0 } })
    .sort({ prontuario: 1 })
    .limit(5000)
    .toArray();
  const pacientes = docs.map((d) => {
    const p = normalizar({ ...d, senhaHash: "" });
    return {
      id: p.prontuario,
      nome: p.nome,
      nivel: p.nivel,
      ala: p.ala,
      xp: p.xp,
      pontos: p.pontos,
      atributos: ATRIBUTOS.map((a) => ({ sigla: a.sigla, nome: a.nome, valor: p.atributos[a.chave] })),
      diagnostico: p.diagnostico,
      notas: [...p.anotacoes]
        .sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime())
        .map((a) => `${dataCurta(new Date(a.em))} · ${a.autor} · ${a.texto}`),
    };
  });
  return <GestaoPacientes pacientes={pacientes} />;
}

export default function CoordPacientesPage() {
  return (
    <Suspense fallback={<Carregando texto="Consultando internações…" />}>
      <Lista />
    </Suspense>
  );
}
