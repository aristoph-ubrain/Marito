"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Anotacao, Carimbo } from "@/components/ui";
import { IDADE_MAX, IDADE_MIN, LIMITE_NOME, LIMITE_PROFISSAO, LIMITE_RELATO, mascaraAltura, NACIONALIDADES, validarIdentificacao, validarRelato } from "@/lib/cadastro";
import { cadastrarPaciente } from "../actions";

const ETAPAS = ["IDENTIFICAÇÃO", "RELATO", "ACESSO"];
const vazio = { nome: "", idade: "", sexo: "", altura: "", nacionalidade: "", profissao: "", relato: "", senha: "", senha2: "", termo: false };
type Dados = typeof vazio;

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="rotulo">{rotulo}</label>
      {children}
    </div>
  );
}

export function FormCadastro() {
  const [etapa, setEtapa] = useState(1);
  const [d, setD] = useState<Dados>(vazio);
  const [erro, setErro] = useState("");
  const [prontuario, setProntuario] = useState("");
  const [quarto, setQuarto] = useState("");
  const [enviando, iniciar] = useTransition();

  const campo = (k: keyof Dados) => ({
    id: k,
    value: d[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      let v = e.target.value;
      if (k === "idade") v = v.replace(/\D/g, "").slice(0, 2);
      if (k === "altura") v = mascaraAltura(v);
      if (k === "nome") v = v.slice(0, LIMITE_NOME);
      if (k === "profissao") v = v.slice(0, LIMITE_PROFISSAO);
      setD((x) => ({ ...x, [k]: v }));
      setErro("");
    },
  });

  const validar = () => {
    if (etapa === 1) {
      const r = validarIdentificacao(d);
      if (typeof r === "string") return r;
    }
    if (etapa === 2) {
      const r = validarRelato(d.relato);
      if (r) return r;
    }
    if (etapa === 3) {
      if (d.senha.length < 6) return "A senha precisa de ao menos 6 caracteres.";
      if (d.senha !== d.senha2) return "As senhas não conferem.";
      if (!d.termo) return "É preciso aceitar o termo para concluir.";
    }
    return "";
  };

  const avancar = () => {
    const e = validar();
    if (e) return setErro(e);
    if (etapa < 3) return setEtapa(etapa + 1);
    iniciar(async () => {
      const r = await cadastrarPaciente(d);
      if (!r.ok) return setErro(r.erro);
      setProntuario(r.prontuario);
      setQuarto(r.quarto);
      setEtapa(4);
    });
  };

  if (etapa === 4) {
    return (
      <div className="flex flex-col gap-3.5">
        <span className="rotulo">INTERNAÇÃO REGISTRADA</span>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs">Seu prontuário</span>
          <span className="anim-datilo font-maquina text-[40px] leading-none">Nº {prontuario}</span>
        </div>
        <p className="m-0 text-sm leading-normal"><b>Paciente:</b> {d.nome}<br /><b>Leito:</b> Dormitório · Leito {quarto}</p>
        <Carimbo>CLASSE: ANÔMALO</Carimbo>
        <p className="m-0 text-xs opacity-85">Guarde este número. Ele será pedido em todo acesso ao sistema.</p>
        <Link href="/login" className="btn btn-pri min-h-[50px] text-[15px] tracking-[1.5px]">ACESSAR SISTEMA →</Link>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/tutorial" className="btn min-h-11 px-2 text-center text-xs leading-tight tracking-[.5px]">COMO JOGAR</Link>
          <Link href="/memorial" className="btn min-h-11 px-2 text-center text-xs leading-tight tracking-[.5px]">MEMORIAL</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/login" className="text-xs">← Voltar ao acesso</Link>
        <span className="text-[11px] tracking-[1px]">FORM. IN-01</span>
      </div>
      <ol className="m-0 flex list-none gap-1 p-0" aria-label="Etapas do cadastro">
        {ETAPAS.map((r, i) => (
          <li key={r} aria-current={etapa === i + 1 ? "step" : undefined}
            className={`flex flex-1 flex-col gap-0.5 border-[1.5px] border-tinta px-1 py-1.5 text-center text-[10px] tracking-[.5px] ${
              etapa === i + 1 ? "bg-tinta text-papel" : etapa > i + 1 ? "bg-[#d9d0b8]" : ""}`}>
            <b>{i + 1}</b><span>{r}</span>
          </li>
        ))}
      </ol>

      {etapa === 1 && (
        <div className="flex flex-col gap-3">
          <h1 className="m-0 font-maquina text-lg font-normal">I. IDENTIFICAÇÃO</h1>
          <Campo id="nome" rotulo={`NOME DO PACIENTE · ${d.nome.length}/${LIMITE_NOME}`}><input className="campo" maxLength={LIMITE_NOME} autoComplete="off" {...campo("nome")} /></Campo>
          <div className="grid grid-cols-2 gap-2.5">
            <Campo id="idade" rotulo={`IDADE (${IDADE_MIN}–${IDADE_MAX})`}><input className="campo" inputMode="numeric" maxLength={2} placeholder="32" {...campo("idade")} /></Campo>
            <Campo id="sexo" rotulo="SEXO">
              <select className="campo" {...campo("sexo")}>
                <option value="">—</option><option value="M">M</option><option value="F">F</option><option value="O">Outro</option>
              </select>
            </Campo>
            <Campo id="altura" rotulo="ALTURA (m)"><input className="campo" inputMode="numeric" maxLength={4} placeholder="1,76" {...campo("altura")} /></Campo>
            <Campo id="nacionalidade" rotulo="NACIONALIDADE">
              <select className="campo" {...campo("nacionalidade")}>
                <option value="">—</option>
                {NACIONALIDADES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Campo>
          </div>
          <Campo id="profissao" rotulo={`PROFISSÃO · ${d.profissao.length}/${LIMITE_PROFISSAO}`}><input className="campo" maxLength={LIMITE_PROFISSAO} autoComplete="off" {...campo("profissao")} /></Campo>
        </div>
      )}

      {etapa === 2 && (
        <div className="flex flex-col gap-3">
          <h1 className="m-0 font-maquina text-lg font-normal">II. RELATO DE ENTRADA</h1>
          <p className="m-0 text-xs leading-snug opacity-85">
            Descreva com suas palavras o que motivou a internação. O diagnóstico será definido pela equipe.
          </p>
          <Campo id="relato" rotulo={`RELATO DO PACIENTE · ${d.relato.length}/${LIMITE_RELATO}`}><textarea className="campo" rows={6} maxLength={LIMITE_RELATO} required {...campo("relato")} /></Campo>
          <Anotacao style={{ fontSize: 18 }}>todos escrevem a mesma coisa nessa parte</Anotacao>
        </div>
      )}

      {etapa === 3 && (
        <div className="flex flex-col gap-3">
          <h1 className="m-0 font-maquina text-lg font-normal">III. ACESSO AO SISTEMA</h1>
          <Campo id="senha" rotulo="SENHA (mín. 6 caracteres)"><input className="campo" type="password" autoComplete="new-password" {...campo("senha")} /></Campo>
          <Campo id="senha2" rotulo="CONFIRMAR SENHA"><input className="campo" type="password" autoComplete="new-password" {...campo("senha2")} /></Campo>
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug">
            <input type="checkbox" checked={d.termo} onChange={() => { setD((x) => ({ ...x, termo: !x.termo })); setErro(""); }}
              className="m-0 h-[22px] w-[22px] flex-none accent-verde" />
            <span>Declaro que minha internação é <s>voluntária</s> e autorizo o registro e a avaliação contínua dos meus atributos.</span>
          </label>
          <p className="m-0 border-l-2 border-tinta pl-2.5 text-xs leading-snug">
            Classificação inicial: <b>ANÔMALO</b>. O número do prontuário será emitido ao final.
          </p>
        </div>
      )}

      {erro && <p role="alert" className="m-0 text-xs text-carimbo">{erro}</p>}
      <div className="flex gap-2">
        {etapa > 1 && <button type="button" className="btn min-h-12 flex-1" onClick={() => { setEtapa(etapa - 1); setErro(""); }}>VOLTAR</button>}
        <button type="button" className="btn btn-pri min-h-12 flex-[2] tracking-[1px]" disabled={enviando} onClick={avancar}>
          {etapa === 3 ? (enviando ? "REGISTRANDO…" : "REGISTRAR INTERNAÇÃO") : "CONTINUAR"}
        </button>
      </div>
      <p className="m-0 text-[10px] leading-snug opacity-70">
        Este formulário registra apenas pacientes. Contas da equipe e da coordenação são emitidas exclusivamente pela diretoria.
      </p>
    </div>
  );
}
