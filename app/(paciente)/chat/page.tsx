import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { ChatGeral } from "@/components/ChatGeral";
import { Anotacao, Titulo } from "@/components/ui";
import { listarMensagens } from "@/lib/chat";
import { pacienteAtual } from "@/lib/dal";

async function Canal() {
  const p = await pacienteAtual();
  const msgs = await listarMensagens(p.prontuario);
  return (
    <>
      <section className="flex flex-col gap-1">
        <Titulo>VIII. CANAL GERAL</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Mensagens registradas pela coordenação e apagadas após 24 horas. Uma mensagem a cada 3 segundos.
        </p>
      </section>
      <ChatGeral iniciais={msgs} modo="paciente" nomeEnvio={p.nome.split(" ")[0]} />
      <Anotacao>ninguém aqui tem o nome riscado</Anotacao>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<Carregando texto="Sintonizando o canal…" />}>
      <Canal />
    </Suspense>
  );
}
