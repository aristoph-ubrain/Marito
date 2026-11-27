import { listarClasses } from "./classes";
import { listarEntidades } from "./entidades";
import { banco, umaVez } from "./db";
import { buscarPaciente, colecaoPacientes, normalizar } from "./pacientes";
import { diaBrasilia, dois } from "./regras";

/** `_id` canônico ("0108:0121", em ordem) impede pedidos cruzados duplicados. */
export type Vinculo = { _id: string; de: string; para: string; estado: "pendente" | "aceito"; criadoEm: Date; aceitoEm?: Date };
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
  classe: string;
  classeCor: string; // cor do carimbo da classe
  acompanhante: { id: string; nome: string } | null; // entidade que acompanha a ficha
  entidades: number; // quantas entidades diferentes já invocou
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
  classe: "███████",
  classeCor: "var(--color-tinta)",
  acompanhante: null,
  entidades: 8,
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
  const cores = new Map((await listarClasses()).map((c) => [c.nome, c.cor]));
  const nomesEnt = new Map((await listarEntidades()).map((e) => [e.id, e.nome]));
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
      classe: p.classe,
      classeCor: cores.get(p.classe) ?? "var(--color-tinta)",
      acompanhante: p.acompanhante && p.entidades[p.acompanhante] ? { id: p.acompanhante, nome: nomesEnt.get(p.acompanhante) ?? "" } : null,
      entidades: Object.keys(p.entidades).length,
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

/* ---------- Busca e sugestões ---------- */

/** Resultado de busca / sugestão: só dados públicos. */
export type PacientePublico = { prontuario: string; nome: string; area: string; nivel: string };
export type EstadoVinculo = "livre" | "amigo" | "enviado" | "recebido";
export type Sugestao = PacientePublico & { motivo: string; estranha?: boolean };

/** Expressão que ignora acentos e maiúsculas ("lucia" acha "Lúcia"). */
function regexSemAcento(termo: string): RegExp {
  const grupos: Record<string, string> = { a: "aáàâãä", e: "eéèêë", i: "iíìîï", o: "oóòôõö", u: "uúùûü", c: "cç", n: "nñ" };
  const base = termo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const corpo = [...base].map((ch) => (grupos[ch] ? `[${grupos[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("");
  return new RegExp(corpo, "i");
}

const publicoDe = (p: { prontuario: string; nome: string; local?: string; ala: string; nivel: number }): PacientePublico => ({
  prontuario: p.prontuario,
  nome: p.nome,
  area: p.local ?? p.ala,
  nivel: dois(p.nivel),
});

async function vinculosDe(eu: string) {
  const meus = await (await colecaoConvivio()).find({ $or: [{ de: eu }, { para: eu }] }).toArray();
  const estado = new Map<string, EstadoVinculo>();
  for (const v of meus) {
    const outro = v.de === eu ? v.para : v.de;
    estado.set(outro, v.estado === "aceito" ? "amigo" : v.de === eu ? "enviado" : "recebido");
  }
  return estado;
}

/** Busca qualquer paciente cadastrado pelo nome ou pelo nº do prontuário (até 8 resultados). */
export async function buscarPacientes(eu: string, termo: string): Promise<(PacientePublico & { estado: EstadoVinculo })[]> {
  const t = termo.trim().slice(0, 40);
  if (t.length < 2) return [];
  const filtro = /^\d+$/.test(t) ? { prontuario: { $regex: `^${t}` } } : { nome: { $regex: regexSemAcento(t) } };
  const docs = await (await colecaoPacientes())
    .find({ ...filtro, prontuario: { ...(filtro as { prontuario?: object }).prontuario, $ne: eu } }, { projection: { _id: 0, prontuario: 1, nome: 1, local: 1, ala: 1, nivel: 1 } })
    .limit(8)
    .toArray();
  const estado = await vinculosDe(eu);
  return docs.map((d) => ({ ...publicoDe(d), estado: estado.get(d.prontuario) ?? "livre" }));
}

async function colecaoDispensas() {
  const col = (await banco()).collection<{ _id: string; eu: string; outro: string; em: Date }>("sugestoes_dispensadas");
  await umaVez("idx:sugestoes_dispensadas", () => col.createIndex({ eu: 1 }));
  return col;
}

export async function dispensarSugestao(eu: string, outro: string) {
  await (await colecaoDispensas()).updateOne({ _id: `${eu}:${outro}` }, { $setOnInsert: { eu, outro, em: new Date() } }, { upsert: true });
}

/** Número estável a partir de um texto (mesma entrada, mesmo resultado). */
function semente(texto: string): number {
  let h = 7;
  for (const c of texto) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0;
  return h;
}

/**
 * Sugestões de convívio: amigos em comum (mais em comum primeiro) e internados na mesma semana,
 * até 3; mais uma sugestão "estranha" por dia, escolhida pela data. Dispensadas não voltam.
 */
export async function sugerirConvivio(eu: string): Promise<Sugestao[]> {
  const pacientes = await colecaoPacientes();
  const [estado, dispensas, euDoc] = await Promise.all([
    vinculosDe(eu),
    (await colecaoDispensas()).find({ eu }).toArray(),
    pacientes.findOne({ prontuario: eu }, { projection: { criadoEm: 1 } }),
  ]);
  const fora = new Set<string>([eu, "0112", ...estado.keys(), ...dispensas.map((d) => d.outro)]);
  const amigos = [...estado].filter(([, e]) => e === "amigo").map(([id]) => id);

  // Amigos dos meus amigos.
  const comum = new Map<string, number>();
  if (amigos.length) {
    const deles = await (await colecaoConvivio()).find({ estado: "aceito", $or: [{ de: { $in: amigos } }, { para: { $in: amigos } }] }).toArray();
    for (const v of deles) {
      for (const [a, b] of [[v.de, v.para], [v.para, v.de]]) {
        if (amigos.includes(a) && !fora.has(b)) comum.set(b, (comum.get(b) ?? 0) + 1);
      }
    }
  }
  // Internados na mesma semana (até 7 dias antes ou depois).
  const semana = new Set<string>();
  if (euDoc?.criadoEm) {
    const t = new Date(euDoc.criadoEm).getTime(), d = 7 * 24 * 60 * 60 * 1000;
    const docs = await pacientes
      .find({ criadoEm: { $gte: new Date(t - d), $lte: new Date(t + d) }, prontuario: { $nin: [...fora] } }, { projection: { _id: 0, prontuario: 1 } })
      .limit(20)
      .toArray();
    docs.forEach((x) => semana.add(x.prontuario));
  }

  const ordem = [...new Set([...[...comum].sort((a, b) => b[1] - a[1]).map(([id]) => id), ...semana])].slice(0, 3);
  const motivos = new Map<string, string>();
  for (const id of ordem) {
    const n = comum.get(id);
    const partes = [n ? `${n} amigo${n > 1 ? "s" : ""} em comum` : "", semana.has(id) ? "internado na mesma semana" : ""].filter(Boolean);
    motivos.set(id, partes.join(" · ").replace(/^./, (c) => c.toUpperCase()));
  }

  // A sugestão estranha do dia: um paciente qualquer fora das outras, escolhido pela data.
  const hoje = diaBrasilia(new Date());
  const resto = await pacientes.countDocuments({ prontuario: { $nin: [...fora, ...ordem] } });
  let estranho: string | null = null;
  if (resto > 0) {
    const pulo = semente(`${hoje}|${eu}`) % resto;
    const d = await pacientes.find({ prontuario: { $nin: [...fora, ...ordem] } }, { projection: { _id: 0, prontuario: 1 } }).sort({ prontuario: 1 }).skip(pulo).limit(1).toArray();
    estranho = d[0]?.prontuario ?? null;
  }

  const ids = estranho ? [...ordem, estranho] : ordem;
  if (!ids.length) return [];
  const docs = await pacientes.find({ prontuario: { $in: ids } }, { projection: { _id: 0, prontuario: 1, nome: 1, local: 1, ala: 1, nivel: 1 } }).toArray();
  return ids
    .map((id) => docs.find((d) => d.prontuario === id))
    .filter((d): d is NonNullable<typeof d> => !!d)
    .map((d) => (d.prontuario === estranho ? { ...publicoDe(d), motivo: "Sugerido por: ██████", estranha: true } : { ...publicoDe(d), motivo: motivos.get(d.prontuario) ?? "" }));
}
