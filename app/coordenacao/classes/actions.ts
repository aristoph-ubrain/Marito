"use server";

import { revalidatePath } from "next/cache";
import { ehOpcaoFoto } from "@/components/Figurinha";
import { colecaoClasses, ehCor, LIMITE_DESCRICAO_CLASSE, limparNomeClasse } from "@/lib/classes";
import { coordenadorDaSessao } from "@/lib/dal";
import { colecaoPacientes } from "@/lib/pacientes";

type Resposta = { ok: true; msg: string; id?: string } | { ok: false; erro: string };
const SEM_ACESSO: Resposta = { ok: false, erro: "Acesso restrito à coordenação." };

function atualizarTelas() {
  revalidatePath("/coordenacao", "layout");
  revalidatePath("/", "layout");
}

export async function salvarClasse(dados: { id: string; nome: string; descricao: string; cor: string; figurinha: number }): Promise<Resposta> {
  if (!(await coordenadorDaSessao())) return SEM_ACESSO;
  const nome = limparNomeClasse(dados?.nome);
  const descricao = typeof dados?.descricao === "string" ? dados.descricao.replace(/\s+/g, " ").trim().slice(0, LIMITE_DESCRICAO_CLASSE) : "";
  if (!nome) return { ok: false, erro: "Dê um nome à classe." };
  if (!ehCor(dados?.cor)) return { ok: false, erro: "Escolha uma cor de carimbo." };
  if (!ehOpcaoFoto(dados?.figurinha)) return { ok: false, erro: "Escolha uma figurinha." };

  const col = await colecaoClasses();
  const atual = await col.findOne({ id: dados.id });
  if (!atual) return { ok: false, erro: "Classe não encontrada." };
  if (await col.findOne({ nome, id: { $ne: atual.id } })) return { ok: false, erro: `Já existe a classe ${nome}.` };

  await col.updateOne({ id: atual.id }, { $set: { nome, descricao, cor: dados.cor, figurinha: dados.figurinha } });
  // O paciente guarda o nome da classe: renomear leva os pacientes junto.
  if (nome !== atual.nome) {
    const pac = await colecaoPacientes();
    await pac.updateMany({ classe: atual.nome }, { $set: { classe: nome } });
    await pac.updateMany({ classeAnterior: atual.nome }, { $set: { classeAnterior: nome } });
  }
  atualizarTelas();
  return { ok: true, msg: `Classe ${nome} salva. Pacientes com ela já veem a mudança.` };
}

export async function novaClasse(): Promise<Resposta> {
  if (!(await coordenadorDaSessao())) return SEM_ACESSO;
  const col = await colecaoClasses();
  const ultima = await col.find().sort({ ordem: -1 }).limit(1).next();
  let nome = "NOVA CLASSE";
  for (let i = 2; await col.findOne({ nome }); i++) nome = `NOVA CLASSE ${i}`;
  const id = `c${Date.now().toString(36)}`;
  await col.insertOne({ id, nome, descricao: "", cor: "#8a3b2e", figurinha: 1, ordem: (ultima?.ordem ?? 0) + 1 });
  revalidatePath("/coordenacao", "layout");
  return { ok: true, msg: "Classe criada. Preencha e salve.", id };
}

export async function apagarClasse(id: string): Promise<Resposta> {
  if (!(await coordenadorDaSessao())) return SEM_ACESSO;
  const col = await colecaoClasses();
  const c = typeof id === "string" ? await col.findOne({ id }) : null;
  if (!c) return { ok: false, erro: "Classe não encontrada." };
  if (c.padrao) return { ok: false, erro: "A classe padrão não pode ser apagada." };
  if (await (await colecaoPacientes()).countDocuments({ classe: c.nome }, { limit: 1 }))
    return { ok: false, erro: "Há pacientes nesta classe. Reclassifique-os antes." };
  await col.deleteOne({ id });
  revalidatePath("/coordenacao", "layout");
  return { ok: true, msg: `Classe ${c.nome} apagada do catálogo.` };
}
