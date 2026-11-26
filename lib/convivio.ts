import { banco, umaVez } from "./db";
import { buscarPaciente, colecaoPacientes, normalizar } from "./pacientes";
import { diaBrasilia, dois } from "./regras";

/** `_id` canônico ("0108:0121", em ordem) impede pedidos cruzados duplicados. */
export type Vinculo = { _id: string; de: string; para: string; estado: "pendente" | "aceito"; criadoEm: Date };
export const idVinculo = (a: string, b: string) => [a, b].sort().join(":");

/** Pedido recebido: só o mínimo, antes do aceite. */
export type Pedido = { prontuario: string; nome: string; nota?: string };

export type Colega = {
  prontuario: string;
  nome: string;
  nivel: string;
  ala: string;
  situacao: string;
  cor: string;
  atributos: (number | "?")[];
  foto?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
};

export async function colecaoConvivio() {
  const col = (await banco()).collection<Vinculo>("convivio");
  // Índice só de consulta; se já existir um antigo com outras opções, segue sem erro.
  await umaVez("idx:convivio", () => col.createIndex({ de: 1, para: 1 }).catch(() => undefined));
  return col;
}

const FANTASMA: Colega = {
  prontuario: "0112",
  nome: "████████",
  nivel: "??",
  ala: "ALA C · Q. 112",
  situacao: "███",
  cor: "var(--color-carimbo)",
  atributos: Array(6).fill("?"),
};

/** Lista amigos, pedidos recebidos e enviados do paciente `eu`. Só expõe dados públicos. */
export async function listarConvivio(eu: string) {
  const col = await colecaoConvivio();
  const meus = await col.find({ $or: [{ de: eu }, { para: eu }] }).toArray();
  const amigosIds = [...new Set(meus.filter((v) => v.estado === "aceito").map((v) => (v.de === eu ? v.para : v.de)))];
  const recebidosIds = [...new Set(meus.filter((v) => v.estado === "pendente" && v.para === eu).map((v) => v.de))].filter((id) => !amigosIds.includes(id));
  const enviados = [...new Set(meus.filter((v) => v.estado === "pendente" && v.de === eu).map((v) => v.para))].filter((id) => !amigosIds.includes(id));

  const ids = [...amigosIds, ...recebidosIds];
  const docs = ids.length
    ? await (await colecaoPacientes()).find({ prontuario: { $in: ids } }, { projection: { _id: 0, senhaHash: 0 } }).toArray()
    : [];
  const publico = (id: string): Colega | null => {
    const d = docs.find((x) => x.prontuario === id);
    if (!d) return null;
    const p = normalizar(d);
    return {
      prontuario: p.prontuario,
      nome: p.nome,
      nivel: dois(p.nivel),
      ala: p.local,
      situacao: p.emCurso ? `Em atividade · ${p.emCurso.codigo}` : "Acordado",
      cor: p.emCurso ? "var(--color-verde)" : "var(--color-tinta-suave)",
      atributos: Object.values(p.atributos),
      foto: p.foto,
    };
  };

  const eu_ = await buscarPaciente(eu);
  const hoje = diaBrasilia(new Date());
  const amigos = amigosIds.map(publico).filter((c): c is Colega => !!c);
  const recebidos: Pedido[] = recebidosIds
    .map((id) => docs.find((x) => x.prontuario === id))
    .filter((d) => !!d)
    .map((d) => ({ prontuario: d.prontuario, nome: d.nome }));
  // O 0112 volta a pedir todo dia, até ser aceito.
  if (eu_?.aceitou0112) amigos.push(FANTASMA);
  else if (eu_?.recusou0112 !== hoje)
    recebidos.unshift({ prontuario: "0112", nome: FANTASMA.nome, nota: "Solicitação recebida às 03:12. O remetente não tem internação registrada." });

  return { amigos, recebidos, enviados };
}
