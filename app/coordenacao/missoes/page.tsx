import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { coordenadorAtual } from "@/lib/dal";
import { listarOrdens } from "@/lib/ordens";
import { ListaOrdens } from "./ListaOrdens";

async function Ordens() {
  await coordenadorAtual();
  return <ListaOrdens ordens={await listarOrdens()} />;
}

export default function CoordMissoesPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Ordens />
    </Suspense>
  );
}
