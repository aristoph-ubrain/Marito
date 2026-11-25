"use client";

import { useState } from "react";
import { Anotacao, Carimbo, Censura, Foto3x4, GradeAtributos, Rodape, Titulo } from "@/components/ui";
import { ATRIBUTOS, type Colega } from "@/lib/mock";

const MEU_PRONTUARIO = "0108";

export function Convivio({
  colegas,
  amigosIniciais,
  pedidosIniciais,
}: {
  colegas: Record<string, Colega>;
  amigosIniciais: string[];
  pedidosIniciais: string[];
}) {
  const [amigos, setAmigos] = useState(amigosIniciais);
  const [pedidos, setPedidos] = useState(pedidosIniciais);
  const [enviados, setEnviados] = useState<string[]>([]);
  const [numero, setNumero] = useState("");
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  // Etapa 4: virará server action (pedido e aceite direto entre pacientes).
  const solicitar = (e: React.FormEvent) => {
    e.preventDefault();
    const n = numero.trim();
    if (!/^\d{4}$/.test(n)) return setMsg({ texto: "Informe os 4 dígitos do prontuário.", ok: false });
    if (n === MEU_PRONTUARIO) return setMsg({ texto: "Este é o seu prontuário.", ok: false });
    if (amigos.includes(n)) return setMsg({ texto: "Paciente já está no convívio.", ok: false });
    if (enviados.includes(n)) return setMsg({ texto: "Solicitação já enviada.", ok: false });
    setEnviados((s) => [...s, n]);
    setNumero("");
    setMsg({ texto: "Solicitação enviada ao paciente.", ok: true });
  };

  if (aberto) {
    const c = colegas[aberto];
    return (
      <>
        <button type="button" className="btn self-start" onClick={() => setAberto(null)}>← VOLTAR AO CONVÍVIO</button>
        <div className="flex items-end justify-between border-b border-tinta pb-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] tracking-[1px]">FICHA DE OUTRO PACIENTE · CONSULTA</span>
            <span className="font-maquina text-[26px] leading-none">Nº {c.prontuario}</span>
          </div>
          <span className="text-[11px]">{c.ala}</span>
        </div>
        <section className="flex items-start gap-3.5">
          <div className="flex flex-1 flex-col gap-1 text-sm leading-snug">
            <div><b>Nome:</b> {c.nome}</div>
            <div><b>Classificação:</b> ANÔMALO</div>
            <div><b>Nível:</b> {c.nivel}</div>
            <div><b>Situação:</b> {c.situacao}</div>
          </div>
          <Foto3x4 largura={90} giro={-2} />
        </section>
        <section className="flex flex-col gap-2">
          <Titulo>ATRIBUTOS</Titulo>
          <GradeAtributos itens={ATRIBUTOS.map((a, i) => ({ sigla: a.sigla, valor: c.atributos[i] }))} />
        </section>
        <section className="flex flex-col gap-2 text-[13px] leading-snug">
          <Titulo>HISTÓRICO CLÍNICO</Titulo>
          <div><Censura>diagnóstico confidencial</Censura></div>
          <div><Censura>medicação e relatos do paciente</Censura> <Censura>restritos</Censura></div>
          <Carimbo giro={-3} tamanho={13}>SIGILO MÉDICO</Carimbo>
        </section>
        <section className="flex flex-col gap-1.5 text-[13px] leading-snug">
          <Titulo>OBSERVAÇÃO COMPARTILHADA</Titulo>
          <div className="border-l-2 border-tinta pl-2.5">{c.observacao}</div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <Titulo>VI. CONVÍVIO</Titulo>
        <p className="m-0 text-xs leading-snug opacity-85">
          Pacientes autorizados a manter contato. O vínculo vale assim que o outro paciente aceitar.
        </p>
        <form onSubmit={solicitar} className="flex flex-col gap-2 border-2 border-tinta p-3">
          <label htmlFor="pront" className="rotulo">ADICIONAR PACIENTE · Nº DO PRONTUÁRIO</label>
          <div className="flex gap-2">
            <input id="pront" inputMode="numeric" maxLength={4} placeholder="0000" value={numero}
              onChange={(e) => { setNumero(e.target.value.replace(/\D/g, "").slice(0, 4)); setMsg(null); }}
              className="campo min-w-0 flex-1 text-xl tracking-[4px]" />
            <button type="submit" className="btn btn-pri">SOLICITAR</button>
          </div>
          {msg && <p role="status" className={`m-0 text-xs ${msg.ok ? "text-verde" : "text-carimbo"}`}>{msg.texto}</p>}
          <span className="text-[11px] opacity-70">Seu prontuário: {MEU_PRONTUARIO}</span>
        </form>
      </section>

      {pedidos.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="text-xs tracking-[.5px]"><b>SOLICITAÇÕES RECEBIDAS</b> ({pedidos.length})</span>
          {pedidos.map((id) => {
            const c = colegas[id];
            return (
              <div key={id} className="flex flex-col gap-2 border-[1.5px] border-dashed border-tinta bg-papel-claro p-3">
                <div className="flex justify-between text-[11px]"><span>PRONT. {id}</span><span>{c.ala}</span></div>
                <span className="font-maquina text-[17px]">{c.nome}</span>
                <span className="text-xs opacity-85">Solicitação recebida às 03:12. O remetente não tem internação registrada.</span>
                <div className="flex gap-2">
                  <button type="button" className="btn flex-1" onClick={() => setPedidos((p) => p.filter((x) => x !== id))}>RECUSAR</button>
                  <button type="button" className="btn btn-pri flex-1"
                    onClick={() => { setAmigos((a) => [...a, id]); setPedidos((p) => p.filter((x) => x !== id)); }}>ACEITAR</button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {enviados.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <span className="text-xs tracking-[.5px]"><b>SOLICITAÇÕES ENVIADAS</b></span>
          {enviados.map((id) => (
            <div key={id} className="flex justify-between border-t border-dashed border-tinta pt-1.5 text-xs">
              <span>Pront. {id}</span><span className="opacity-75">aguardando resposta</span>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <span className="text-xs tracking-[.5px]"><b>PACIENTES NO CONVÍVIO</b> ({amigos.length})</span>
        {amigos.map((id) => {
          const c = colegas[id];
          return (
            <div key={id} className="flex flex-col gap-2 border-[1.5px] border-tinta bg-papel-claro p-3">
              <div className="flex justify-between border-b border-dashed border-tinta pb-1.5 text-[11px]"><span>PRONT. {id}</span><span>{c.ala}</span></div>
              <div className="flex items-center gap-2.5">
                <Foto3x4 largura={44} giro={0} />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-maquina text-[17px]">{c.nome}</span>
                  <span className="text-xs">ANÔMALO · Nv. {c.nivel}</span>
                  <span className="text-xs" style={{ color: c.cor }}>● {c.situacao}</span>
                </div>
              </div>
              <button type="button" className="btn self-end" onClick={() => setAberto(id)}>VER FICHA →</button>
            </div>
          );
        })}
      </section>

      <Anotacao>O 0112 me adicionou de novo. Eu recusei ontem.</Anotacao>
      <Rodape>Contato entre pacientes sujeito a revisão. Encontros fora dos horários permitidos devem ser relatados.</Rodape>
    </>
  );
}
