import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { pacienteAtual } from "@/lib/dal";
import { listarPaginas, PAGINA_INICIAL, proximaPagina, TOTAL_PAGINAS, ULTIMA } from "@/lib/diario";
import { dataCurta } from "@/lib/regras";
import { revelaAlaZero } from "@/lib/habilidades";
import { DiarioEncontrado, type PaginaVista } from "./DiarioEncontrado";

async function Diario() {
  const p = await pacienteAtual();
  const paginas = await listarPaginas();
  const veAlaZero = p.nivel >= 8 || revelaAlaZero(p.atributos);
  const achadas = new Map(p.paginas.map((x) => [x.n, x]));
  const proxima = proximaPagina([...achadas.keys()]);
  const completo = paginas.filter((x) => x.n <= TOTAL_PAGINAS).every((x) => achadas.has(x.n));
  // Só o texto das páginas achadas vai para o navegador; das outras, só a dica da área.
  const vistas: PaginaVista[] = paginas.map((pg) => {
    const a = achadas.get(pg.n);
    const aberta = pg.n === ULTIMA ? completo : !!a;
    return aberta
      ? {
          n: pg.n,
          aberta: true,
          data: pg.data,
          texto: pg.texto,
          outra: pg.outra,
          onde: pg.n === ULTIMA
            ? "Encontrada sob o colchão do quarto 112, depois da última página."
            : pg.n === PAGINA_INICIAL
              ? "Estava dentro da sua ficha de internação, entre as folhas em branco." : `Encontrada em: ${pg.area} · ${a ? dataCurta(new Date(a.em)) : ""} · ao concluir uma ordem de atividade`,
        }
      : {
          n: pg.n,
          aberta: false,
          // Só a próxima página mostra onde está; as outras dependem dela.
          dica: pg.n === ULTIMA ? "LACRADA" : pg.n !== proxima ? "" : pg.area === "ALA ZERO" && !veAlaZero ? "ALA ████" : pg.area,
        };
  });
  const nova = p.paginaNova ? vistas.find((v) => v.n === p.paginaNova && v.aberta) : undefined;
  const area = p.paginaNova ? achadas.get(p.paginaNova)?.area : undefined;
  return <DiarioEncontrado paginas={vistas} achadas={achadas.size} nova={nova ? { n: nova.n, area: area ?? "" } : null} />;
}

export default function DiarioPage() {
  return (
    <Suspense fallback={<Carregando texto="Juntando as páginas…" />}>
      <Diario />
    </Suspense>
  );
}
