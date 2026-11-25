"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Carimbo } from "@/components/ui";
import { entrarCoordenacao, entrarPaciente, sair } from "../actions";

type Perfil = "paciente" | "coordenacao";

export function FormLogin({ prontuarioSalvo }: { prontuarioSalvo?: string }) {
  const [perfil, setPerfil] = useState<Perfil>("paciente");
  const [usuario, setUsuario] = useState(prontuarioSalvo ?? "");
  const [lembrar, setLembrar] = useState(!!prontuarioSalvo);
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [ajuda, setAjuda] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [nome, setNome] = useState("");
  const [entrando, iniciar] = useTransition();
  const pac = perfil === "paciente";

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    const u = usuario.trim();
    if (!u || !senha) return setErro(`Preencha ${pac ? "o prontuário" : "o usuário"} e a senha.`);
    if (pac && !/^\d{4}$/.test(u)) return setErro("O prontuário tem 4 dígitos.");
    if (pac && u === "0112") return setErro("Prontuário 0112 já está conectado.");
    setErro("");
    iniciar(async () => {
      const r = pac ? await entrarPaciente(u, senha, lembrar) : await entrarCoordenacao(u, senha);
      if (!r.ok) return setErro(r.erro);
      setNome(r.nome);
      setOk(true);
    });
  };

  if (ok) {
    return (
      <div className="flex flex-col gap-3.5">
        <Carimbo cor="verde" giro={-3} tamanho={16}>ACESSO AUTORIZADO</Carimbo>
        <p className="m-0 text-sm leading-normal">
          {pac ? `Paciente ${usuario.trim()}${nome ? ` (${nome})` : ""} identificado. Bem-vindo de volta.` : "Membro da equipe identificado. Bem-vindo à coordenação."}
        </p>
        <p className="m-0 text-xs opacity-80">Último acesso: hoje, 03:17 · Terminal ALA C</p>
        <Link href={pac ? "/ficha" : "/coordenacao/missoes"} className="btn btn-pri min-h-[50px] text-[15px] tracking-[1.5px]">
          {pac ? "ABRIR PRONTUÁRIO →" : "ABRIR PAINEL →"}
        </Link>
        <form action={sair} className="flex flex-col">
          <button type="submit" className="btn">SAIR</button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-3.5">
      <h1 className="m-0 font-maquina text-lg font-normal">ACESSO AO SISTEMA</h1>
      <div className="flex flex-col gap-1.5">
        <span className="rotulo">PERFIL DE ACESSO</span>
        <div className="flex" role="group" aria-label="Perfil de acesso">
          {(["paciente", "coordenacao"] as Perfil[]).map((p, i) => (
            <button key={p} type="button" aria-pressed={perfil === p}
              onClick={() => { setPerfil(p); setErro(""); setUsuario(p === "paciente" ? prontuarioSalvo ?? "" : ""); }}
              className={`btn flex-1 tracking-[1px] ${i ? "border-l-0" : ""} ${perfil === p ? "btn-escuro" : ""}`}>
              {p === "paciente" ? "PACIENTE" : "COORDENAÇÃO"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="usuario" className="rotulo">{pac ? "Nº DO PRONTUÁRIO" : "USUÁRIO DA EQUIPE"}</label>
        <input id="usuario" autoComplete="username" placeholder={pac ? "0000" : "nome.sobrenome"}
          inputMode={pac ? "numeric" : "text"} value={usuario}
          onChange={(e) => { setUsuario(pac ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value); setErro(""); }}
          className={`campo text-lg tracking-[3px] ${erro ? "campo-erro" : ""}`} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className="rotulo">SENHA</label>
        <div className="flex">
          <input id="senha" type={verSenha ? "text" : "password"} autoComplete="current-password" value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(""); }}
            className={`campo min-w-0 flex-1 border-r-0 text-lg ${erro ? "campo-erro" : ""}`} />
          <button type="button" className="btn w-[60px] px-0 text-[11px]" aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setVerSenha((v) => !v)}>{verSenha ? "OCULTAR" : "VER"}</button>
        </div>
      </div>
      {pac && (
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] leading-snug">
          <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} className="m-0 h-5 w-5 flex-none accent-verde" />
          <span>Lembrar meu nº de prontuário neste aparelho</span>
        </label>
      )}
      {erro && <p role="alert" className="m-0 text-xs text-carimbo">{erro}</p>}
      <button type="submit" disabled={entrando} className="btn btn-pri min-h-[50px] text-[15px] tracking-[1.5px]">
        {entrando ? "VERIFICANDO…" : "ACESSAR SISTEMA"}
      </button>
      <div className={`grid gap-2 ${pac ? "grid-cols-2" : "grid-cols-1"}`}>
        {pac && (
          <Link href="/cadastro" className="btn min-h-11 px-2 text-center text-xs leading-tight tracking-[.5px]">
            PRIMEIRA INTERNAÇÃO
          </Link>
        )}
        <button
          type="button"
          aria-expanded={ajuda}
          aria-controls="ajuda-senha"
          onClick={() => setAjuda((v) => !v)}
          className="btn min-h-11 px-2 text-center text-xs leading-tight tracking-[.5px]"
        >
          ESQUECI A SENHA
        </button>
      </div>
      {ajuda && (
        <p id="ajuda-senha" role="status" className="m-0 border border-dashed border-tinta px-2.5 py-2 text-xs leading-snug">
          {pac
            ? "Procure a enfermaria com o seu nº de prontuário. A senha só pode ser trocada pela equipe."
            : "Contas da coordenação são reemitidas pela diretoria."}
        </p>
      )}
      <div className="border-t border-dashed border-tinta pt-2 text-center text-xs">
        <Link href="/memorial">Sobre a instituição · Memorial do Sanatório Marito</Link>
      </div>
    </form>
  );
}
