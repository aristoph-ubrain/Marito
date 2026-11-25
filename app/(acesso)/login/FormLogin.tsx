"use client";

import Link from "next/link";
import { useState } from "react";
import { Carimbo } from "@/components/ui";

type Perfil = "paciente" | "coordenacao";

export function FormLogin() {
  const [perfil, setPerfil] = useState<Perfil>("paciente");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const pac = perfil === "paciente";

  // Etapa 3: virará server action com verificação de senha e cookie de sessão.
  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    const u = usuario.trim();
    if (!u || !senha) return setErro(`Preencha ${pac ? "o prontuário" : "o usuário"} e a senha.`);
    if (pac && !/^\d{4}$/.test(u)) return setErro("O prontuário tem 4 dígitos.");
    if (u === "0112") return setErro("Prontuário 0112 já está conectado.");
    setErro("");
    setOk(true);
  };

  if (ok) {
    return (
      <div className="flex flex-col gap-3.5">
        <Carimbo cor="verde" giro={-3} tamanho={16}>ACESSO AUTORIZADO</Carimbo>
        <p className="m-0 text-sm leading-normal">
          {pac ? `Paciente ${usuario.trim()} identificado. Bem-vindo de volta.` : "Membro da equipe identificado. Bem-vindo à coordenação."}
        </p>
        <p className="m-0 text-xs opacity-80">Último acesso: hoje, 03:17 · Terminal ALA C</p>
        <Link href={pac ? "/ficha" : "/coordenacao/missoes"} className="btn btn-pri min-h-[50px] text-[15px] tracking-[1.5px]">
          {pac ? "ABRIR PRONTUÁRIO →" : "ABRIR PAINEL →"}
        </Link>
        <button type="button" className="btn" onClick={() => { setOk(false); setSenha(""); }}>SAIR</button>
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
              onClick={() => { setPerfil(p); setErro(""); setUsuario(""); }}
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
      {erro && <p role="alert" className="m-0 text-xs text-carimbo">{erro}</p>}
      <button type="submit" className="btn btn-pri min-h-[50px] text-[15px] tracking-[1.5px]">ACESSAR SISTEMA</button>
      <div className="flex justify-between gap-2.5 text-xs">
        {pac ? <Link href="/cadastro">Primeira internação?</Link> : <span />}
        <span className="opacity-70">Esqueci a senha: procure a enfermaria</span>
      </div>
    </form>
  );
}
