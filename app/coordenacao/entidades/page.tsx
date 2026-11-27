import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { coordenadorAtual } from "@/lib/dal";
import { ENTIDADES_ORIGINAIS, listarEntidades } from "@/lib/entidades";
import { colecaoPacientes } from "@/lib/pacientes";
import { ControleEntidades } from "./ControleEntidades";

async function Controle() {
  await coordenadorAtual();
  const col = await colecaoPacientes();
  const [entidades, pacientes, contagem] = await Promise.all([
    listarEntidades(),
    col.find({}, { projection: { _id: 0, prontuario: 1, nome: 1, luas: 1 } }).sort({ prontuario: 1 }).limit(5000).toArray(),
    Promise.all(ENTIDADES_ORIGINAIS.map((e) => col.countDocuments({ [`entidades.${e.id}`]: { $gte: 1 } }))),
  ]);
  return (
    <ControleEntidades
      entidades={entidades.map((e, i) => ({ ...e, pacientes: contagem[i] }))}
      originais={ENTIDADES_ORIGINAIS}
      pacientes={pacientes.map((p) => ({ id: p.prontuario, nome: p.nome, luas: p.luas ?? 0 }))}
    />
  );
}

export default function CoordEntidadesPage() {
  return (
    <Suspense fallback={<Carregando texto="Contando as luas…" />}>
      <Controle />
    </Suspense>
  );
}
