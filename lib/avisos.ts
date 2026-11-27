/**
 * Avisos internos do paciente: o que mudou desde o último "CIENTE".
 * Assuntos: classificação, convívio, chat, áreas e equipe. A linha das 03:17 aparece sempre (narrativa).
 */
import { contarMensagensDesde } from "./chat";
import { colecaoConvivio } from "./convivio";
import { banco, umaVez } from "./db";
import { buscarPaciente, colecaoPacientes } from "./pacientes";
import { dataCurta, diaBrasilia, horaBrasilia } from "./regras";

export type Aviso = { tipo: "convivio" | "chat" | "area" | "equipe" | "classe" | "diario" | "lua"; texto: string; detalhe?: string; href: string };
export type Avisos = { desde: string; itens: Aviso[]; linha0317: string | null };

async function colecaoAreas() {
  const col = (await banco()).collection<{ em: Date; texto: string }>("avisos_areas");
  await umaVez("idx:avisos_areas", () => col.createIndex({ em: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 }));
  return col;
}

/** Chamado quando a coordenação muda uma área (vale para todos os pacientes). */
export async function registrarAvisosArea(textos: string[]) {
  if (!textos.length) return;
  const agora = new Date();
  await (await colecaoAreas()).insertMany(textos.map((texto) => ({ em: agora, texto })));
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export async function listarAvisos(eu: string): Promise<Avisos | null> {
  const p = await buscarPaciente(eu);
  if (!p) return null;
  const desde = new Date(p.avisosVistosEm ?? p.criadoEm);
  const agora = new Date();
  const itens: Aviso[] = [];

  // Classificação: reclassificação feita pela coordenação.
  if (p.classeEm && new Date(p.classeEm) > desde) {
    itens.push({
      tipo: "classe",
      texto: `Reclassificação: ${p.classeAnterior ?? "—"} → ${p.classe}`,
      detalhe: p.classeMotivo ? `Motivo: ${p.classeMotivo}` : undefined,
      href: "/ficha",
    });
  }

  // Diário: páginas achadas nas missões.
  const achadas = p.paginas.filter((x) => new Date(x.em) > desde);
  if (achadas.length) {
    itens.push({
      tipo: "diario",
      texto: plural(achadas.length, "página do diário encontrada", "páginas do diário encontradas"),
      detalhe: achadas.map((x) => `Pág. ${String(x.n).padStart(2, "0")} · ${x.area}`).join(" · "),
      href: "/diario",
    });
  }

  // Luas Negras: achadas nas ordens ou deixadas pela coordenação.
  const luas = p.luasRecebidas.filter((x) => new Date(x.em) > desde);
  const achadasLua = luas.filter((x) => x.origem === "missao").reduce((s, x) => s + x.qtd, 0);
  const deixadas = luas.filter((x) => x.origem === "mestre").reduce((s, x) => s + x.qtd, 0);
  if (achadasLua || deixadas) {
    itens.push({
      tipo: "lua",
      texto: [achadasLua ? plural(achadasLua, "Lua Negra achada nas ordens", "Luas Negras achadas nas ordens") : "", deixadas ? `${deixadas === 1 ? "uma lua foi deixada" : `${deixadas} luas foram deixadas`} no seu leito` : ""].filter(Boolean).join(" · "),
      detalhe: `Guardadas: ${p.luas}`,
      href: "/entidades",
    });
  }

  // Convívio: pedidos recebidos e pedidos meus aceitos desde então (e o 0112, que insiste).
  const conv = await colecaoConvivio();
  const [recebidos, aceitos] = await Promise.all([
    conv.find({ para: eu, estado: "pendente", criadoEm: { $gt: desde } }).toArray(),
    conv.find({ de: eu, estado: "aceito", aceitoEm: { $gt: desde } }).toArray(),
  ]);
  const nomes = async (ids: string[]) =>
    ids.length ? (await (await colecaoPacientes()).find({ prontuario: { $in: ids } }, { projection: { _id: 0, nome: 1 } }).toArray()).map((d) => d.nome.split(" ")[0]) : [];
  const pedidos = await nomes(recebidos.map((v) => v.de));
  if (!p.aceitou0112 && p.recusou0112 !== diaBrasilia(agora)) pedidos.push("████████");
  if (pedidos.length) itens.push({ tipo: "convivio", texto: plural(pedidos.length, "pedido de convívio", "pedidos de convívio"), detalhe: pedidos.join(" · "), href: "/convivio" });
  if (aceitos.length) {
    const quem = await nomes(aceitos.map((v) => v.para));
    itens.push({ tipo: "convivio", texto: `${quem.join(", ")} ${aceitos.length === 1 ? "aceitou" : "aceitaram"} seu convívio`, href: "/convivio" });
  }

  // Chat: mensagens de outros desde então.
  const chat = await contarMensagensDesde(desde, eu);
  if (chat.total) {
    itens.push({ tipo: "chat", texto: `${plural(chat.total, "mensagem", "mensagens")} no canal geral`, detalhe: chat.coordenacao ? `${chat.coordenacao} da Coordenação` : undefined, href: "/chat" });
  }

  // Áreas: mudanças feitas pela coordenação.
  const areas = await (await colecaoAreas()).find({ em: { $gt: desde } }).sort({ em: -1 }).limit(6).toArray();
  if (areas.length) itens.push({ tipo: "area", texto: [...new Set(areas.map((a) => a.texto))].join(" · "), href: "/alas" });

  // Equipe: anotações novas na ficha.
  const notas = p.anotacoes.filter((a) => new Date(a.em) > desde);
  if (notas.length) {
    const ultima = notas[notas.length - 1];
    itens.push({ tipo: "equipe", texto: `${plural(notas.length, "anotação nova", "anotações novas")} na sua ficha`, detalhe: `${ultima.autor}, ${dataCurta(new Date(ultima.em))} ${horaBrasilia(new Date(ultima.em))}`, href: "/ficha" });
  }

  return {
    desde: `${dataCurta(desde)}, ${horaBrasilia(desde)}`,
    itens,
    // Sempre presente depois das 03:17 do dia.
    linha0317: horaBrasilia(agora) >= "03:17" ? "03:17 · Seu prontuário foi consultado." : null,
  };
}

export async function marcarAvisosVistos(eu: string) {
  await (await colecaoPacientes()).updateOne({ prontuario: eu }, { $set: { avisosVistosEm: new Date() } });
}
