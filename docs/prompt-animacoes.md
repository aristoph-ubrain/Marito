# Prompt — animações do Hospital Marito

> Use este texto como instrução para melhorar (ou revisar) as animações do jogo.

Você vai adicionar animações ao jogo **Hospital Marito**, um RPG idle de navegador (Next.js 16, React 19,
Tailwind 4) com visual de **prontuário datilografado** e **terror psicológico sutil**. O jogo é usado
principalmente no **celular**.

## Objetivo
Dar vida às telas sem deixá-las lentas: o jogador deve sentir o papel, a máquina de escrever, o carimbo
e, de vez em quando, que algo está errado no hospital.

## Clima (todos os quatro)
1. **Papel e máquina de escrever** — títulos datilografados, carimbos batendo, folhas e bilhetes
   que deslizam ou se desdobram, foto que "revela".
2. **Terror sutil** — raro e curto: tarja de censura que pulsa, anotação à caneta que treme um instante,
   a luz da folha que pisca uma vez a cada tanto. Nunca sustos, sons, sangue ou tela inteira piscando.
3. **Feedback de jogo** — barra de XP enchendo, "+XP" subindo, carimbo de nível novo, missão concluída,
   erro de login sacudindo o campo.
4. **Transições entre telas** — cada tela entra suave e seus blocos aparecem em sequência curta.

## Intensidade: discreta
- Duração típica 150–400 ms (no máximo ~600 ms para a barra de XP).
- Poucas animações por tela; nada em loop chamativo. Efeitos de terror: um ciclo longo (≥ 9 s)
  com um instante de alteração.
- Só `transform`, `opacity`, `clip-path` e `filter` (sem animar layout).
- Sem bibliotecas novas: CSS (`@keyframes` em `app/globals.css`, camada `components`) e, quando
  preciso, um pouco de estado no React.

## Telas
- **Login e cadastro:** título datilografado; carimbo do perfil; campo com erro sacode; nº do
  prontuário revelado como se fosse batido à máquina, com o carimbo CLASSE: ANÔMALO.
- **Missões e XP:** cartões em sequência; carimbos LIBERADA/ACESSO NEGADO batem; barra de XP e
  barra de progresso deslizam; ao ganhar XP, "+N XP" sobe e some; ao subir de nível, carimbo
  "NÍVEL NN" com +3 pontos.
- **Ficha, atributos e alas:** foto nova "revela" (sépia/borrão → nítida); marcas de contagem novas
  surgem riscadas; na planta, o "VOCÊ ESTÁ AQUI" bate como carimbo ao mudar de área.
- **Chat, bilhetes e histórico:** mensagem nova entra deslizando; bilhete se desdobra ao aparecer e
  é rasgado ao meio quando o jogador rasga; lançamentos do livro aparecem em sequência.

## Acessibilidade (obrigatório)
Com `prefers-reduced-motion: reduce`, mantenha **apenas o feedback** (barra de XP, "+XP", carimbo
de nível, erro) e remova transições de tela, cascatas, carimbos decorativos, datilografia, tremores
e piscadas. Nenhuma informação pode existir só na animação; leitores de tela devem receber o mesmo
texto (use `role="status"` para avisos de XP e nível).

## Entrega
- Classes reutilizáveis com prefixo `anim-` documentadas em `globals.css`.
- Componentes de `components/ui.tsx` (Titulo, Carimbo, BarraXp, Censura, Anotacao) já animados, para
  as telas herdarem.
- `template.tsx` nos grupos de rotas para a transição de tela.
- Conferir com `tsc` e `eslint`; registrar no commit o que mudou.
