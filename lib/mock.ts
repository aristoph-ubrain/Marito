/**
 * Dados de exemplo da Etapa 1 (sem banco). Serão substituídos pelo MongoDB na Etapa 2.
 */

export type ChaveAtributo =
  | "FOR" | "AGI" | "SOR" | "CON" | "AFI" | "VIN" | "COM" | "RIT" | "DOM" | "SIM";

export const ATRIBUTOS: { chave: ChaveAtributo; sigla: string; nome: string; descricao: string }[] = [
  { chave: "FOR", sigla: "FOR", nome: "Força", descricao: "Potência muscular, dano físico e capacidade de carregar peso." },
  { chave: "AGI", sigla: "AGI", nome: "Agilidade", descricao: "Velocidade, reflexos, esquiva e movimentos rápidos." },
  { chave: "SOR", sigla: "SOR", nome: "Sorte", descricao: "Influência sobre acontecimentos imprevisíveis." },
  { chave: "CON", sigla: "CON", nome: "Conhecimento", descricao: "Domínio de ciências, ocultismo, história e conhecimentos específicos." },
  { chave: "AFI", sigla: "AFI", nome: "Afinidade", descricao: "Sensibilidade e conexão com o paranormal, rituais e manifestações sobrenaturais." },
  { chave: "VIN", sigla: "VÍN", nome: "Vínculo", descricao: "Conexão e comunicação com entidades e espíritos." },
  { chave: "COM", sigla: "COM", nome: "Comando", descricao: "Capacidade de controlar e direcionar manifestações sobrenaturais." },
  { chave: "RIT", sigla: "RIT", nome: "Ritualismo", descricao: "Capacidade de realizar rituais e procedimentos ocultos." },
  { chave: "DOM", sigla: "DOM", nome: "Dominação", descricao: "Capacidade de resistir ou impor sua vontade sobre outras consciências." },
  { chave: "SIM", sigla: "SIM", nome: "Simbiose", descricao: "Capacidade de compartilhar corpo, sentidos e habilidades com entidades." },
];

export const siglaDe = (c: ChaveAtributo) => ATRIBUTOS.find((a) => a.chave === c)!.sigla;

export const paciente = {
  prontuario: "0108",
  nome: "Aristoph Ubrain",
  idade: 32,
  sexo: "M",
  altura: "1,76 m",
  nacionalidade: "Brasileira",
  profissao: "Home office",
  classe: "ANÔMALO",
  nivel: 3,
  xp: 1240,
  pontos: 3,
  ala: "ALA A",
  quarto: "108",
  diagnostico: "CID F20 (Esquizofrenia)",
  medicacao: "antipsicóticos em uso",
  alergias: "sem alergias",
  relato:
    "Relatos de “outra realidade”, sinais de uma entidade chamada “Caos”, teoria da conspiração, dúvida sobre simulação / controle por IA.",
  sintomas: "pensamentos desconexos, medo de simulação / controle mental por IA.",
  gatilhos: "“sinais” do Caos, vigilância, isolamento, quebra de rotina.",
  missoesHoje: 2,
  atributos: { FOR: 3, AGI: 4, SOR: 2, CON: 5, AFI: 3, VIN: 6, COM: 1, RIT: 2, DOM: 1, SIM: 0 } as Record<ChaveAtributo, number>,
  anotacoes: [
    { data: "14/11", autor: "Enf. R. Matos", texto: "Paciente colaborativo. Aceitou medicação. Pediu que a luz do corredor ficasse acesa." },
    { data: "20/11", autor: "Dr. ██████", texto: "Reclassificado como ANÔMALO após avaliação. Não discutir o resultado com o paciente." },
    { data: "24/11", autor: "Enf. noturno", texto: "Paciente conversou por 40 minutos com o quarto ao lado. O quarto ao lado está vazio." },
    { data: "26/11", autor: "██████", texto: "Paciente transferido para Ala ██.", futuro: true },
  ],
};

export type Missao = {
  codigo: string;
  titulo: string;
  local: string;
  descricao: string;
  requisitos: { atributo: ChaveAtributo; minimo: number }[];
  xp: number | null;
  duracao: number; // segundos
};

export const missoes: Missao[] = [
  { codigo: "OS-011", titulo: "Inventário da Farmácia", local: "TÉRREO · FARMÁCIA", descricao: "Conferir estoque de medicação controlada. Há mais frascos registrados do que pacientes.", requisitos: [{ atributo: "CON", minimo: 3 }], xp: 80, duracao: 20 },
  { codigo: "OS-014", titulo: "Turno na Lavanderia", local: "ALA B · SUBSOLO", descricao: "Separar roupas de cama. Uma das etiquetas tem o número do seu prontuário.", requisitos: [{ atributo: "FOR", minimo: 3 }], xp: 60, duracao: 15 },
  { codigo: "OS-019", titulo: "Escutar o Quarto 112", local: "ALA C · 2º ANDAR", descricao: "Pacientes relatam batidas na parede. O quarto 112 está vazio desde 1998.", requisitos: [{ atributo: "VIN", minimo: 5 }, { atributo: "AFI", minimo: 3 }], xp: 220, duracao: 40 },
  { codigo: "OS-023", titulo: "Corredor das Portas Trancadas", local: "ALA C · 3º ANDAR", descricao: "Verificar as fechaduras durante a ronda. Uma delas abre por dentro.", requisitos: [{ atributo: "AGI", minimo: 4 }, { atributo: "SOR", minimo: 4 }], xp: 180, duracao: 35 },
  { codigo: "OS-027", titulo: "Sessão com o Dr. ██████", local: "CONSULTÓRIO 4", descricao: "Entrevista sem prontuário anexado. O paciente deve manter contato visual.", requisitos: [{ atributo: "DOM", minimo: 3 }], xp: 260, duracao: 45 },
  { codigo: "OS-0██", titulo: "████████ ████", local: "ALA ██", descricao: "Documento retirado do arquivo por ordem da diretoria.", requisitos: [{ atributo: "SIM", minimo: 5 }, { atributo: "RIT", minimo: 4 }], xp: null, duracao: 60 },
];

export type Ala = {
  id: string;
  nome: string;
  sub: string;
  nivel: number;
  missoes: number | "?";
  ocorrencias: string[];
  secreta?: boolean;
};

export const alas: Ala[] = [
  { id: "T", nome: "TÉRREO", sub: "Recepção · Farmácia · Refeitório", nivel: 1, missoes: 1, ocorrencias: ["02:40 — Máquina do refeitório ligou sozinha.", "03:05 — Farmácia: contagem de frascos não confere."] },
  { id: "A", nome: "ALA A", sub: "Dormitórios · Internação", nivel: 1, missoes: 0, ocorrencias: ["Quarto 108: paciente acordado às 03:17.", "Câmera 4 sem sinal por 11 minutos."] },
  { id: "B", nome: "ALA B", sub: "Lavanderia · Subsolo", nivel: 2, missoes: 1, ocorrencias: ["Elevador de serviço parou no -2. O prédio não tem -2."] },
  { id: "K", nome: "CONSULTÓRIOS", sub: "Atendimento · Salas 1 a 4", nivel: 2, missoes: 1, ocorrencias: ["Consultório 4 agendado para paciente sem prontuário."] },
  { id: "C", nome: "ALA C", sub: "Interditada desde 1998", nivel: 3, missoes: 2, ocorrencias: ["Luz acesa no 2º andar.", "Acesso liberado pelo sistema. Nenhum funcionário assinou."] },
  { id: "P", nome: "CAPELA", sub: "Desativada · Uso proibido", nivel: 5, missoes: 0, ocorrencias: ["Velas encontradas acesas na segunda-feira."] },
  { id: "X", nome: "ALA ZERO", sub: "Sem registro na planta oficial", nivel: 8, missoes: "?", ocorrencias: ["Registro inexistente."], secreta: true },
];

export type Colega = {
  prontuario: string;
  nome: string;
  nivel: string;
  ala: string;
  situacao: string;
  cor: string;
  atributos: (number | "?")[];
  observacao: string;
};

export const colegas: Record<string, Colega> = {
  "0094": { prontuario: "0094", nome: "Helena Duarte", nivel: "05", ala: "ALA B", situacao: "Em atividade · OS-014", cor: "var(--color-verde)", atributos: [5, 3, 4, 2, 3, 2, 1, 1, 3, 0], observacao: "Ajuda na lavanderia. Diz que reconhece as etiquetas." },
  "0121": { prontuario: "0121", nome: "Tomás Ferraz", nivel: "02", ala: "ALA A", situacao: "Acordado", cor: "var(--color-verde)", atributos: [2, 2, 3, 4, 1, 1, 0, 1, 1, 0], observacao: "Dorme de luz acesa. Pediu para dividir o quarto com o 0108." },
  "0077": { prontuario: "0077", nome: "Iara Menezes", nivel: "07", ala: "ALA C", situacao: "Dormindo desde 03:00", cor: "var(--color-tinta-suave)", atributos: [2, 4, 3, 6, 5, 4, 3, 4, 2, 1], observacao: "Primeira paciente a entrar na Ala C após a reabertura." },
  "0112": { prontuario: "0112", nome: "████████", nivel: "??", ala: "ALA C · Q. 112", situacao: "███", cor: "var(--color-carimbo)", atributos: Array(10).fill("?"), observacao: "Sem registro de internação. O quarto 112 está vazio desde 1998." },
};

export type TipoRegistro = "ev" | "os" | "ac" | "cv";

export const historico: {
  data: string;
  rasgado?: boolean;
  registros: { hora: string; tipo: TipoRegistro; codigo: string; texto: string; xp?: string; nota?: string; futuro?: boolean }[];
}[] = [
  { data: "26/11", registros: [{ hora: "03:17", tipo: "ac", codigo: "AC-██", texto: "Acesso à Ala ██ concedido. Transferência agendada.", futuro: true, nota: "esse dia ainda não aconteceu" }] },
  {
    data: "25/11 · HOJE",
    registros: [
      { hora: "03:17", tipo: "ev", codigo: "EV-07", texto: "+1 Vínculo. Aprovado por: ██████.", nota: "eu não distribuí esse ponto" },
      { hora: "03:12", tipo: "cv", codigo: "CV-0112", texto: "Solicitação de convívio recebida: Pront. 0112." },
      { hora: "02:40", tipo: "os", codigo: "OS-011", texto: "Inventário da Farmácia concluído.", xp: "+80 XP" },
      { hora: "01:40", tipo: "ac", codigo: "AC-C", texto: "Primeira entrada na Ala C.", xp: "+200 XP" },
      { hora: "01:12", tipo: "ac", codigo: "AC-C", texto: "Ala C liberada (nível 03). Nenhum funcionário assinou." },
      { hora: "00:01", tipo: "ev", codigo: "BN-D", texto: "Acesso diário registrado.", xp: "+50 XP" },
    ],
  },
  {
    data: "24/11",
    registros: [
      { hora: "23:50", tipo: "os", codigo: "OS-014", texto: "Turno na Lavanderia concluído.", xp: "+60 XP" },
      { hora: "22:30", tipo: "cv", codigo: "CV-0077", texto: "Convívio aceito: Pront. 0077 · Iara Menezes." },
      { hora: "03:17", tipo: "ev", codigo: "EV-06", texto: "Avaliação registrada: +2 Conhecimento, +1 Agilidade." },
      { hora: "00:03", tipo: "ev", codigo: "BN-D", texto: "Acesso diário registrado.", xp: "+50 XP" },
    ],
  },
  {
    data: "21/11",
    registros: [
      { hora: "03:17", tipo: "ev", codigo: "EV-05", texto: "Nível 02 → 03. +3 pontos de atributo.", xp: "1.500 XP no nível" },
      { hora: "14:00", tipo: "ac", codigo: "AC-K", texto: "Consultórios liberados (nível 02)." },
    ],
  },
  { data: "15/11 — 20/11 · FOLHAS AUSENTES", rasgado: true, registros: [] },
  {
    data: "14/11",
    registros: [
      { hora: "09:00", tipo: "ev", codigo: "EV-01", texto: "Classificação inicial registrada: ANÔMALO." },
      { hora: "08:40", tipo: "ac", codigo: "AC-A", texto: "Internação registrada. Ala A, quarto 108." },
    ],
  },
];
