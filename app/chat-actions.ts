"use server";

import { limparTexto, listarMensagens, LIMITE_MENSAGEM, INTERVALO_ENVIO_S, publicar, type MensagemVista } from "@/lib/chat";
import { coordenadorDaSessao, prontuarioDaSessao } from "@/lib/dal";
import { consumir } from "@/lib/limite";
import { buscarPaciente } from "@/lib/pacientes";
import { revela0112 } from "@/lib/habilidades";

type Resposta = { ok: true } | { ok: false; erro: string };

function validar(texto: unknown): string | { erro: string } {
  const t = limparTexto(texto);
  if (!t) return { erro: "Escreva uma mensagem." };
  if (t.length > LIMITE_MENSAGEM) return { erro: `Máximo de ${LIMITE_MENSAGEM} caracteres.` };
  return t;
}

/** Busca mensagens novas (chamado a cada 3 s pela tela). */
export async function buscarMensagens(depois: number): Promise<MensagemVista[]> {
  const eu = await prontuarioDaSessao();
  if (!eu && !(await coordenadorDaSessao())) return [];
  const p = eu ? await buscarPaciente(eu) : null;
  return listarMensagens(eu ?? undefined, typeof depois === "number" ? depois : undefined, !!p && revela0112(p.atributos));
}

export async function enviarMensagem(texto: string): Promise<Resposta> {
  const eu = await prontuarioDaSessao();
  if (!eu) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const t = validar(texto);
  if (typeof t !== "string") return { ok: false, ...t };
  if (!(await consumir(`chat:${eu}`, 1, INTERVALO_ENVIO_S)))
    return { ok: false, erro: `Aguarde ${INTERVALO_ENVIO_S} segundos entre mensagens.` };
  const p = await buscarPaciente(eu);
  if (!p) return { ok: false, erro: "Paciente não encontrado." };
  await publicar({ tipo: "paciente", autor: p.nome.split(" ")[0], prontuario: eu, texto: t });
  return { ok: true };
}

/** Coordenação: mensagem oficial (com nome) ou aviso do sistema (sem autor). */
export async function enviarComoCoordenacao(texto: string, comoSistema: boolean): Promise<Resposta> {
  const quem = await coordenadorDaSessao();
  if (!quem) return { ok: false, erro: "Acesso restrito à coordenação." };
  const t = validar(texto);
  if (typeof t !== "string") return { ok: false, ...t };
  if (!(await consumir(`chat:e:${quem.usuario}`, 1, INTERVALO_ENVIO_S)))
    return { ok: false, erro: `Aguarde ${INTERVALO_ENVIO_S} segundos entre mensagens.` };
  await publicar(comoSistema ? { tipo: "sistema", autor: "Sistema", texto: t } : { tipo: "coordenacao", autor: `Coordenação · ${quem.nome}`, texto: t });
  return { ok: true };
}
