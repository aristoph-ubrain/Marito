import { Suspense } from "react";
import { connection } from "next/server";
import { listarOrdens } from "@/lib/ordens";
import { ListaOrdens } from "./ListaOrdens";

async function Ordens() {
  await connection(); // dados sempre frescos, lidos a cada acesso
  return <ListaOrdens ordens={await listarOrdens()} />;
}

export default function CoordMissoesPage() {
  return (
    <Suspense fallback={<p className="text-xs">Consultando o arquivo…</p>}>
      <Ordens />
    </Suspense>
  );
}
