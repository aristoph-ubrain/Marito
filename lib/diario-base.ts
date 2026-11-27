/**
 * Diário da enfermeira C. (1974): 12 páginas achadas nas missões + a última entrada.
 * Textos originais e funções sem banco (podem ir para o navegador). O Mestre pode
 * editar data, área e texto; as edições ficam em lib/diario.ts.
 */

export type Pagina = {
  n: number; // 1 a 12; 13 = última entrada
  data: string;
  area: string; // nome da área (igual ao campo `ala` das ordens)
  texto: string; // [tarja]…[/tarja] vira tarja preta; \n separa parágrafos
  outra: boolean; // letra de outra pessoa
};

export const TOTAL_PAGINAS = 12;
export const ULTIMA = 13;
/** Página que todo paciente já recebe na internação. */
export const PAGINA_INICIAL = 1;
/** Chance de achar uma página ao concluir uma ordem (na área da ordem). */
export const CHANCE_PAGINA = 0.01;
export const LIMITE_TEXTO_PAGINA = 400;
/** Áreas que não podem ser trocadas pelo Mestre (página da Ala Zero e a última). */
export const AREA_FIXA: Record<number, string> = { 12: "ALA ZERO", 13: "QUARTO 112" };

export const PAGINAS_ORIGINAIS: Pagina[] = [
  { n: 1, data: "12/03/1974", area: "RECEPÇÃO", outra: false, texto: "Comecei hoje no Marito. A diretora diz que o programa novo vai medir o que não se vê. Recebi uma prancheta com seis colunas e nenhuma explicação.\nUm paciente perguntou se eu também tinha número." },
  { n: 2, data: "19/03/1974", area: "DORMITÓRIO", outra: false, texto: "Os pacientes dormem de luz acesa, por ordem médica. Ninguém sabe de que médico.\nÀs 3 da manhã contei os leitos: 31. A lista diz 30." },
  { n: 3, data: "02/04/1974", area: "REFEITÓRIO", outra: false, texto: "Sobrou uma bandeja de novo. Sempre a mesma: sem nome, colher do lado esquerdo. A cozinheira diz que é do 112.\nNão existe quarto 112." },
  { n: 4, data: "15/04/1974", area: "FARMÁCIA", outra: false, texto: "O frasco de [tarja]cloridrato[/tarja] some e volta cheio. Anoto as quantidades a lápis, porque a caneta não fica no papel desta sala.\nNinguém mais acha isso estranho." },
  { n: 5, data: "30/04/1974", area: "CONSULTÓRIO", outra: false, texto: "Primeira avaliação completa. O doutor marcou VÍNCULO alto em quem mais chorava. Disse que esses escutam melhor.\nPerguntei: escutam o quê? Ele riu e escreveu meu nome na margem." },
  { n: 6, data: "21/05/1974", area: "INTERNAÇÃO", outra: false, texto: "Primeiros classificados como ANÔMALOS. Transferência à noite, família não avisada. Assinei como testemunha.\nA letra não parecia a minha." },
  { n: 7, data: "06/06/1974", area: "SUBSOLO", outra: false, texto: "A escada de serviço tem 14 degraus para descer e 13 para subir. Contei três vezes.\nO vigia diz que é normal. Que ela guarda um." },
  { n: 8, data: "03/07/1974", area: "ALA C", outra: false, texto: "Renumeraram os quartos da Ala C. O 112 agora existe. Está vazio, mas a cama amanhece desfeita." },
  { n: 9, data: "17/08/1974", area: "CAPELA", outra: true, texto: "não fui eu que escrevi a página anterior. eu nunca entrei na ala c. alguém está usando o meu diário para falar com vocês." },
  { n: 10, data: "03/09/1974", area: "DORMITÓRIO", outra: false, texto: "Às 03:17 todos se sentaram na cama ao mesmo tempo. Nenhum acordou.\nDe manhã, o VÍNCULO tinha subido em todos. Sem registro de avaliação." },
  { n: 11, data: "12/10/1974", area: "SUBSOLO", outra: false, texto: "Achei a porta que não está na planta. Placa raspada, maçaneta quente.\nDo outro lado, alguém lia em voz alta a minha prancheta." },
  { n: 12, data: "31/10/1974", area: "ALA ZERO", outra: false, texto: "Fui transferida. Não por ordem médica: eu pedi. Eles precisam de alguém que anote.\nSe você está lendo isto, você também foi avaliado. Confira o seu número." },
  { n: 13, data: "██/██/1998", area: "QUARTO 112", outra: true, texto: "O quarto 112 ficou vazio em 1998. Eu não.\nObrigada por juntar as páginas. Agora tenho o que me faltava: alguém que leia.\n— C." },
];

/** A próxima página que pode ser achada: a primeira que falta (as páginas saem em ordem). */
export function proximaPagina(tem: number[]): number | null {
  for (let n = 1; n <= TOTAL_PAGINAS; n++) if (!tem.includes(n)) return n;
  return null;
}

export const ehNumeroPagina = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= ULTIMA;

/** Divide o texto em trechos normais e tarjados, para desenhar a tarja preta. */
export function trechos(texto: string): { t: string; tarja: boolean }[] {
  const out: { t: string; tarja: boolean }[] = [];
  const re = /\[tarja\]([\s\S]*?)\[\/tarja\]/g;
  let i = 0;
  for (let m = re.exec(texto); m; m = re.exec(texto)) {
    if (m.index > i) out.push({ t: texto.slice(i, m.index), tarja: false });
    out.push({ t: m[1], tarja: true });
    i = m.index + m[0].length;
  }
  if (i < texto.length) out.push({ t: texto.slice(i), tarja: false });
  return out;
}

/** Texto sem as marcas de tarja (a parte tarjada vira █). */
export const semMarcas = (texto: string) => texto.replace(/\[tarja\]([\s\S]*?)\[\/tarja\]/g, (_, x: string) => "█".repeat(Math.max(4, x.length)));
