/**
 * Narrativa do 0112 no livro de ocorrências. Nada disto é gravado no banco:
 * as frases são escolhidas pela data e pelo prontuário, então cada dia mostra
 * sempre a mesma frase para o mesmo paciente (e pacientes diferentes veem frases diferentes).
 */
import type { RegistroVisto } from "./LivroOcorrencias";

/** Anotações que o 0112 deixa, uma por dia, às 03:17. */
const ANOTACOES = [
  "dormi na sua cama enquanto você estava na atividade",
  "contei você duas vezes na contagem de hoje",
  "a enfermeira perguntou por você. eu respondi",
  "você deixou a porta aberta. obrigado",
  "hoje a escada tinha um degrau a mais",
  "escrevi seu nome na parede do 112",
  "você falou dormindo. eu respondi",
  "não acenda a luz quando acordar",
  "seu relato está errado. eu estava lá",
  "amanhã eu te mostro a ala",
];

/** Registros datados de amanhã. `{p}` vira o nº do prontuário do paciente. */
const PREVISOES: Omit<RegistroVisto, "hora" | "futuro">[] = [
  { tipo: "ac", codigo: "AC-██", texto: "Acesso à Ala ██ concedido. Transferência agendada.", nota: "esse dia ainda não aconteceu" },
  { tipo: "ev", codigo: "CT-0317", texto: "Contagem das 03:17: 1 interno a mais. Pront. {p} ausente do leito.", nota: "eu estava dormindo. eu acho" },
  { tipo: "ac", codigo: "AC-AM", texto: "Prontuário {p} transferido para o arquivo morto.", nota: "por que o meu prontuário?" },
  { tipo: "cv", codigo: "CV-0112", texto: "Convívio aceito: Pront. 0112. Sem internação registrada.", nota: "eu ainda não aceitei" },
  { tipo: "ev", codigo: "EV-██", texto: "Avaliação registrada: +1 Vínculo. Aprovado por: ██████.", nota: "não fui eu" },
  { tipo: "ac", codigo: "AC-C", texto: "Saída da Ala C registrada. Entrada não registrada.", nota: "esse dia ainda não aconteceu" },
  { tipo: "ac", codigo: "AC-112", texto: "Quarto 112 ocupado. Paciente: Pront. {p}.", nota: "esse é o meu número" },
];

/** Número estável a partir de um texto (mesma entrada, mesmo resultado). */
function semente(texto: string): number {
  let h = 7;
  for (const c of texto) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0;
  return h;
}

export function anotacaoDoDia(dia: string, prontuario: string): RegistroVisto {
  return { hora: "03:17", tipo: "fa", codigo: "0112", texto: ANOTACOES[semente(`${dia}|${prontuario}|a`) % ANOTACOES.length] };
}

export function previsaoDeAmanha(dia: string, prontuario: string): RegistroVisto {
  const p = PREVISOES[semente(`${dia}|${prontuario}|p`) % PREVISOES.length];
  return { ...p, hora: "03:17", futuro: true, texto: p.texto.replaceAll("{p}", prontuario) };
}
