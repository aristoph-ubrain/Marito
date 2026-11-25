import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { listarAlas } from "@/lib/alas";
import { coordenadorAtual } from "@/lib/dal";
import { colecaoPacientes } from "@/lib/pacientes";
import { ControleAlas } from "./ControleAlas";

async function Controle() {
  await coordenadorAtual();
  const [alas, contagem] = await Promise.all([
    listarAlas(),
    (await colecaoPacientes()).aggregate<{ _id: string; n: number }>([{ $group: { _id: { $ifNull: ["$local", "$ala"] }, n: { $sum: 1 } } }]).toArray(),
  ]);
  const pacientes = Object.fromEntries(contagem.map((c) => [c._id, c.n]));
  return (
    <ControleAlas
      key={alas.map((a) => `${a.id}${a.nivel}${a.situacao}`).join("|")}
      alas={alas.map((a) => ({
        id: a.id,
        nome: a.secreta ? "ALA ██" : a.nome,
        sub: a.sub,
        nivel: a.nivel,
        situacao: a.situacao,
        secreta: !!a.secreta,
        pacientes: a.secreta ? "?" : String(pacientes[a.nome] ?? 0),
      }))}
    />
  );
}

export default function CoordAlasPage() {
  return (
    <Suspense fallback={<Carregando texto="Abrindo o controle de acesso…" />}>
      <Controle />
    </Suspense>
  );
}
