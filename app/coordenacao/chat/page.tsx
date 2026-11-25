import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { ChatGeral } from "@/components/ChatGeral";
import { Titulo } from "@/components/ui";
import { listarMensagens } from "@/lib/chat";
import { coordenadorAtual } from "@/lib/dal";

async function Canal() {
  const quem = await coordenadorAtual();
  const msgs = await listarMensagens();
  return (
    <>
      <section className="flex flex-col gap-1">
        <Titulo>CANAL GERAL · MONITORAMENTO</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Suas mensagens aparecem em verde como “Coordenação”. Avisos do sistema aparecem sem nome, em itálico.
        </p>
      </section>
      <ChatGeral iniciais={msgs} modo="coordenacao" nomeEnvio={`Coordenação · ${quem.nome}`} />
    </>
  );
}

export default function CoordChatPage() {
  return (
    <Suspense fallback={<Carregando texto="Abrindo o canal…" />}>
      <Canal />
    </Suspense>
  );
}
