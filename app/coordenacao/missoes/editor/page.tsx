import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { coordenadorAtual } from "@/lib/dal";
import { buscarOrdem } from "@/lib/ordens";
import { EditorOrdem } from "./EditorOrdem";

async function Editor({ searchParams }: { searchParams: Promise<{ codigo?: string | string[] }> }) {
  await coordenadorAtual();
  const { codigo } = await searchParams;
  const ordem = typeof codigo === "string" ? await buscarOrdem(codigo) : null;
  return (
    <EditorOrdem
      key={ordem?.codigo ?? "nova"}
      inicial={
        ordem
          ? {
              codigo: ordem.codigo,
              titulo: ordem.titulo,
              ala: ordem.ala,
              descricao: ordem.descricao,
              requisitos: ordem.requisitos,
              xp: ordem.xp,
              duracao: ordem.duracao,
              publicada: ordem.situacao === "pub",
              protegida: !!ordem.protegida,
            }
          : null
      }
    />
  );
}

export default function EditorPage({ searchParams }: { searchParams: Promise<{ codigo?: string | string[] }> }) {
  return (
    <Suspense fallback={<Carregando texto="Abrindo a ordem…" />}>
      <Editor searchParams={searchParams} />
    </Suspense>
  );
}
