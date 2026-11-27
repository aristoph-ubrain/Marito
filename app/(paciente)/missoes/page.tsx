import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { alaAcessivel, listarAlas } from "@/lib/alas";
import { pacienteAtual } from "@/lib/dal";
import { listarMissoesPublicadas } from "@/lib/ordens";
import { listarPaginas } from "@/lib/diario";
import { diaBrasilia } from "@/lib/regras";
import { automacaoLiberada } from "@/lib/habilidades";
import { QuadroMissoes } from "./QuadroMissoes";

async function Quadro() {
  const p = await pacienteAtual();
  const [missoes, alas, paginas] = await Promise.all([listarMissoesPublicadas(), listarAlas(), p.paginaNova ? listarPaginas() : null]);
  // Página do diário achada e ainda não lida: aviso no topo das Missões.
  const achada = p.paginaNova ? p.paginas.find((x) => x.n === p.paginaNova) : undefined;
  const texto = achada && paginas?.find((x) => x.n === achada.n);
  const pagina =
    achada && texto
      ? { n: achada.n, area: achada.area, os: achada.os ?? null, data: texto.data, texto: texto.texto, outra: texto.outra }
      : null;
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
      atributos={p.atributos}
      filaAtiva={!!p.automacoes.fila && automacaoLiberada("fila", p.atributos)}
      repetirAtivo={!!p.automacoes.repetir && automacaoLiberada("repetir", p.atributos)}
      repetirLiberado={automacaoLiberada("repetir", p.atributos)}
      fila={p.fila.map((f) => ({ codigo: f.codigo, titulo: f.titulo }))}
      paginaNova={pagina}
      luas={p.luas}
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
