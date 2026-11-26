import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { listarClasses } from "@/lib/classes";
import { coordenadorAtual } from "@/lib/dal";
import { colecaoPacientes } from "@/lib/pacientes";
import { ControleClasses } from "./ControleClasses";

async function Catalogo() {
  await coordenadorAtual();
  const [classes, contagem] = await Promise.all([
    listarClasses(),
    (await colecaoPacientes()).aggregate<{ _id: string; n: number }>([{ $group: { _id: "$classe", n: { $sum: 1 } } }]).toArray(),
  ]);
  const n = Object.fromEntries(contagem.map((c) => [c._id, c.n]));
  return <ControleClasses classes={classes.map((c) => ({ ...c, padrao: !!c.padrao, pacientes: n[c.nome] ?? 0 }))} />;
}

export default function CoordClassesPage() {
  return (
    <Suspense fallback={<Carregando texto="Abrindo o catálogo de classes…" />}>
      <Catalogo />
    </Suspense>
  );
}
