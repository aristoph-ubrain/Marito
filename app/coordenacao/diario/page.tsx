import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { NOMES_ALAS } from "@/lib/alas";
import { coordenadorAtual } from "@/lib/dal";
import { listarPaginas, PAGINAS_ORIGINAIS, TOTAL_PAGINAS } from "@/lib/diario";
import { colecaoPacientes } from "@/lib/pacientes";
import { EditorDiario } from "./EditorDiario";

async function Editor() {
  await coordenadorAtual();
  const col = await colecaoPacientes();
  const [paginas, porPagina, comPaginas, completos] = await Promise.all([
    listarPaginas(),
    col.aggregate<{ _id: number; n: number }>([{ $unwind: "$paginas" }, { $group: { _id: "$paginas.n", n: { $sum: 1 } } }]).toArray(),
    col.countDocuments({ "paginas.0": { $exists: true } }),
    col.countDocuments({ [`paginas.${TOTAL_PAGINAS - 1}`]: { $exists: true } }),
  ]);
  const achadas = Object.fromEntries(porPagina.map((x) => [x._id, x.n]));
  return (
    <EditorDiario
      paginas={paginas.map((p) => ({ ...p, achadaPor: p.n === 13 ? completos : achadas[p.n] ?? 0 }))}
      originais={PAGINAS_ORIGINAIS}
      areas={NOMES_ALAS}
      comPaginas={comPaginas}
      completos={completos}
    />
  );
}

export default function CoordDiarioPage() {
  return (
    <Suspense fallback={<Carregando texto="Abrindo o diário…" />}>
      <Editor />
    </Suspense>
  );
}
