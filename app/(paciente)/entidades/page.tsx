import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { pacienteAtual } from "@/lib/dal";
import { listarEntidades } from "@/lib/entidades";
import { ColecaoEntidades, type EntidadeVista } from "./ColecaoEntidades";

async function Colecao() {
  const p = await pacienteAtual();
  const todas = await listarEntidades();
  // Das entidades ainda não invocadas, só o "?" vai para o navegador.
  const lista: EntidadeVista[] = todas.map((e) =>
    p.entidades[e.id]
      ? { id: e.id, tem: true, nome: e.nome, raridade: e.raridade, descricao: e.descricao, vezes: p.entidades[e.id] }
      : { id: null, tem: false },
  );
  return <ColecaoEntidades lista={lista} luas={p.luas} acompanhante={p.acompanhante ?? null} />;
}

export default function EntidadesPage() {
  return (
    <Suspense fallback={<Carregando texto="Apagando as luzes…" />}>
      <Colecao />
    </Suspense>
  );
}
