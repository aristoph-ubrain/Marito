import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Anotacao, Censura, Papel, Selo } from "@/components/ui";
import { ATRIBUTO_INICIAL, ATRIBUTOS } from "@/lib/atributos";
import { BILHETES_POR_DIA, LIMITE_BILHETE } from "@/lib/bilhetes";
import { BONUS_ACESSO_DIARIO, BONUS_PRIMEIRA_VISITA_ALA, milhar, PONTOS_POR_NIVEL, xpParaProximoNivel } from "@/lib/regras";

export const metadata: Metadata = { title: "Como jogar — Manual do Interno" };

const NIVEIS = [1, 2, 3, 4, 5];

function Passo({ n, titulo, onde, children }: { n: number; titulo: string; onde?: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className="flex h-[34px] w-[34px] flex-none items-center justify-center border-2 border-tinta font-maquina text-[17px]">
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-1.5 text-[13px] leading-relaxed">
        <h2 className="m-0 font-maquina text-base leading-tight font-normal">{titulo}</h2>
        {onde && <span className="self-start border border-tinta px-1.5 text-[10px] tracking-[1.5px]">{onde}</span>}
        {children}
      </div>
    </li>
  );
}

export default function TutorialPage() {
  return (
    <Papel>
      <span
        className="absolute top-6 left-3 -rotate-[7deg] border-[2.5px] border-verde px-2 py-0.5 font-maquina text-[11px] tracking-[2px] text-verde opacity-85"
        aria-hidden="true"
      >
        LEITURA OBRIGATÓRIA
      </span>

      <Link href="/login" className="self-end text-xs">← Voltar ao acesso</Link>

      <header className="flex flex-col items-center gap-1.5 border-b-2 border-tinta pb-3.5 text-center">
        <Selo tamanho={52} />
        <span className="text-[10px] tracking-[2px]">ORIENTAÇÃO AO NOVO INTERNO</span>
        <h1 className="m-0 font-maquina text-[22px] leading-tight font-normal">MANUAL DO INTERNO</h1>
        <span className="text-[11px] opacity-80">Como usar o Sistema de Registro e Avaliação de Pacientes (SRAP). Leia antes do primeiro acesso.</span>
      </header>

      <p className="m-0 text-[13px] leading-relaxed">
        Aqui você é um paciente. Cumpra ordens de atividade, ganhe experiência (XP), suba de nível e fortaleça seus atributos para
        alcançar áreas mais fundas do hospital. As atividades continuam correndo mesmo com o sistema fechado.
      </p>

      <ol className="m-0 flex list-none flex-col gap-[18px] p-0">
        <Passo n={1} titulo="INTERNAÇÃO" onde="PRIMEIRA INTERNAÇÃO">
          <p className="m-0">
            Preencha a ficha, escreva o relato de entrada e crie a senha. No fim você recebe o <b>nº do prontuário</b> (4 dígitos). É
            com ele que você entra no sistema. Guarde.
          </p>
        </Passo>

        <Passo n={2} titulo="ATRIBUTOS E HABILIDADES" onde="ATRIBUTOS">
          <p className="m-0">
            Todo interno começa com {ATRIBUTO_INICIAL} em cada um dos {ATRIBUTOS.length} atributos e <b>{PONTOS_POR_NIVEL} pontos</b>{" "}
            para distribuir. Cada nível novo dá mais {PONTOS_POR_NIVEL}. Não há teto.
          </p>
          <p className="m-0 text-xs opacity-85">{ATRIBUTOS.map((a) => a.sigla).join(" · ")}</p>
          <p className="m-0">
            Cada atributo tem uma <b>habilidade</b>: AGI encurta as missões, FOR e CON aumentam a XP, VIT estende o tempo em que as automações
            seguem com você fora, SOR pode fazer a missão contar duas vezes e VIN… escuta. A cada 5 pontos, o atributo abre um marco: com 10 em AGI,
            VIT ou CON você liga repetir missão, fila de ordens ou distribuição automática dos pontos. Tudo na mesma tela de atributos.
          </p>
          <p className="m-0">Os atributos não liberam ordens de atividade: isso é pelo nível.</p>
        </Passo>

        <Passo n={3} titulo="ORDENS DE ATIVIDADE" onde="MISSÕES">
          <p className="m-0">
            Cada ordem pede um <b>nível mínimo</b>, definido pela coordenação, e acesso à área onde acontece. Inicie uma por vez e espere o tempo dela; não há limite
            por dia. Pode fechar o sistema: ao voltar, a XP já estará no seu prontuário.
          </p>
          <p className="m-0">Ordens em vermelho estão bloqueadas: falta nível ou a área ainda não foi liberada.</p>
          <p className="m-0">
            Às vezes, entre os papéis de uma ordem concluída, aparece uma <b>página de diário</b> de 1974. Cada área guarda páginas
            diferentes. Junte as 12 na aba <b>DIÁRIO</b>.
          </p>
        </Passo>

        <Passo n={4} titulo="NÍVEIS">
          <p className="m-0">Cada nível pede 1,5 vez a XP do anterior. O que sobra passa para o próximo.</p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th scope="col" className="border border-tinta px-1.5 py-1 text-left text-[11px] tracking-[1px]">NÍVEL</th>
                <th scope="col" className="border border-tinta px-1.5 py-1 text-left text-[11px] tracking-[1px]">XP PARA SUBIR</th>
              </tr>
            </thead>
            <tbody>
              {NIVEIS.map((n) => (
                <tr key={n}>
                  <td className="border border-tinta px-1.5 py-1">{n} → {n + 1}</td>
                  <td className="border border-tinta px-1.5 py-1">{milhar(xpParaProximoNivel(n))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Passo>

        <Passo n={5} titulo="ÁREAS" onde="ALAS">
          <p className="m-0">
            Cada área do hospital (Recepção, Farmácia, Refeitório, Dormitório, Internação, Consultório, Subsolo, Ala C, Capela) abre num nível próprio. Toque numa área liberada e use <b>IR PARA ESTA ÁREA</b>. A primeira entrada em cada uma rende{" "}
            <b>+{BONUS_PRIMEIRA_VISITA_ALA} XP</b>.
          </p>
          <p className="m-0">Algumas áreas podem ser interditadas pela coordenação sem aviso.</p>
        </Passo>

        <Passo n={6} titulo="ROTINA DIÁRIA">
          <p className="m-0">
            Entre todo dia: o primeiro acesso rende <b>+{BONUS_ACESSO_DIARIO} XP</b>. O dia vira à meia-noite, horário de Brasília.
          </p>
        </Passo>

        <Passo n={7} titulo="CONVÍVIO, BILHETES E CHAT" onde="CONVÍVIO · CHAT">
          <p className="m-0">
            Adicione outros internos pelo nº do prontuário e veja a ficha deles quando aceitarem. No chat geral, todos os internos
            conversam. Mensagens somem em 24 horas.
          </p>
          <p className="m-0">
            Em <b>Convívio › Bilhetes</b>, mande bilhetes privados para quem está no seu convívio: {BILHETES_POR_DIA} por dia, até{" "}
            {LIMITE_BILHETE} caracteres. Chegam na hora, somem em 24 horas e podem ser rasgados. A equipe não lê.
          </p>
        </Passo>

        <Passo n={8} titulo="FICHA E HISTÓRICO" onde="FICHA · HISTÓRICO">
          <p className="m-0">
            Na ficha ficam seus dados, o diagnóstico e as anotações da equipe. Toque na foto para escolher outra figurinha. O relato de
            entrada pode ser reescrito em <b>EDITAR RELATO</b>; o diagnóstico só a equipe altera.
          </p>
          <p className="m-0">
            O histórico registra tudo o que acontece com você, dia a dia, inclusive as anotações da equipe. Registros que você não
            reconhece também devem ser relatados.
          </p>
        </Passo>
      </ol>

      <section className="flex flex-col gap-2 border-[1.5px] border-tinta p-3">
        <h2 className="m-0 font-maquina text-[15px] font-normal">RESUMO DO DIA</h2>
        <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[13px] leading-relaxed">
          <li>Entre e receba o bônus diário.</li>
          <li>Distribua os pontos novos.</li>
          <li>Inicie uma ordem de atividade.</li>
          <li>Visite uma área que ainda não conhece.</li>
          <li>Leia e responda os bilhetes do seu convívio.</li>
          <li>Volte mais tarde para recolher a XP.</li>
        </ol>
      </section>

      <Anotacao>
        se alguém sem ficha pedir convívio,
        <br />
        pense bem antes de aceitar.
      </Anotacao>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/cadastro" className="btn btn-pri min-h-11 px-2 text-center text-xs leading-tight tracking-[.5px]">PRIMEIRA INTERNAÇÃO</Link>
        <Link href="/login" className="btn min-h-11 px-2 text-center text-xs leading-tight tracking-[.5px]">JÁ TENHO PRONTUÁRIO</Link>
      </div>

      <footer className="flex items-end justify-between gap-2.5 border-t border-dashed border-tinta pt-2.5 text-[10px] leading-snug">
        <span>
          Enfermaria Central · Formulário 04
          <br />
          Página 1 de <Censura>2</Censura>
        </span>
        <span className="text-right">
          Assinatura do interno
          <br />
          _______________________
        </span>
      </footer>
    </Papel>
  );
}
