import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { alaAcessivel, listarAlas } from "@/lib/alas";
import { pacienteAtual } from "@/lib/dal";
import { listarMissoesPublicadas } from "@/lib/ordens";
import { diaBrasilia } from "@/lib/regras";
import { QuadroMissoes } from "./QuadroMissoes";

async function Quadro() {
  const p = await pacienteAtual();
  const [missoes, alas] = await Promise.all([listarMissoesPublicadas(), listarAlas()]);
  const alasFechadas = alas.filter((a) => !a.secreta && !alaAcessivel(a, p.nivel)).map((a) => a.nome);
  const agora = new Date();
  const hoje = diaBrasilia(agora);

  return (
    <QuadroMissoes
      prontuario={p.prontuario}
      agoraServidor={agora.getTime()}
      missoes={missoes}
      nivel={p.nivel}
      xp={p.xp}
      feitasHoje={p.missoesHoje.dia === hoje ? p.missoesHoje.n : 0}
      concluidas={p.concluidas}
      alasFechadas={alasFechadas}
      emCurso={p.emCurso ? { codigo: p.emCurso.codigo, inicio: new Date(p.emCurso.inicio).getTime(), duracao: p.emCurso.duracao } : null}
    />
  );
}

export default function MissoesPage() {
  return (
    <Suspense fallback={<Carregando texto="Consultando o quadro…" />}>
      <Quadro />
    </Suspense>
  );
}
