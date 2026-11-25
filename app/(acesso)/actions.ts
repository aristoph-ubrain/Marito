"use server";

import { redirect } from "next/navigation";
import { validarIdentificacao, validarRelato } from "@/lib/cadastro";
import { autenticarEquipe } from "@/lib/equipe";
import { consumir, ipAtual, zerar } from "@/lib/limite";
import { autenticarPaciente, criarPaciente, type NovoPaciente } from "@/lib/pacientes";
import { criarSessao, encerrarSessao, lembrarProntuario } from "@/lib/sessao";

type DadosCadastro = {
  nome: string;
  idade: string;
  sexo: string;
  altura: string;
  nacionalidade: string;
  profissao: string;
  relato: string;
  senha: string;
  senha2: string;
  termo: boolean;
};

export type ResultadoCadastro = { ok: true; prontuario: string; quarto: string } | { ok: false; erro: string };
export type ResultadoLogin = { ok: true; nome: string } | { ok: false; erro: string };

const texto = (v: unknown) => (typeof v === "string" ? v : "");

export async function cadastrarPaciente(d: DadosCadastro): Promise<ResultadoCadastro> {
  // Mesmas regras do formulário, conferidas de novo no servidor.
  const id = validarIdentificacao({
    nome: texto(d?.nome),
    idade: texto(d?.idade),
    sexo: texto(d?.sexo),
    altura: texto(d?.altura),
    nacionalidade: texto(d?.nacionalidade),
    profissao: texto(d?.profissao),
  });
  if (typeof id === "string") return { ok: false, erro: id };
  const erroRelato = validarRelato(texto(d?.relato));
  if (erroRelato) return { ok: false, erro: erroRelato };
  const senha = texto(d?.senha);
  if (senha.length < 6) return { ok: false, erro: "A senha precisa de ao menos 6 caracteres." };
  if (senha.length > 72) return { ok: false, erro: "A senha pode ter no máximo 72 caracteres." };
  if (senha !== texto(d?.senha2)) return { ok: false, erro: "As senhas não conferem." };
  if (d?.termo !== true) return { ok: false, erro: "É preciso aceitar o termo para concluir." };
  if (!(await consumir(`cadastro:${await ipAtual()}`, 5, 60 * 60)))
    return { ok: false, erro: "Muitas internações registradas a partir deste terminal. Tente mais tarde." };

  const dados: NovoPaciente = { ...id, relato: texto(d.relato).trim() };

  try {
    const p = await criarPaciente(dados, senha);
    return { ok: true, prontuario: p.prontuario, quarto: p.quarto };
  } catch (e) {
    console.error("Falha no cadastro:", e);
    return { ok: false, erro: "Não foi possível registrar a internação. Tente novamente." };
  }
}

export async function entrarPaciente(prontuario: string, senha: string, lembrar = false): Promise<ResultadoLogin> {
  prontuario = texto(prontuario);
  senha = texto(senha);
  if (!/^\d{4}$/.test(prontuario)) return { ok: false, erro: "O prontuário tem 4 dígitos." };
  if (!senha) return { ok: false, erro: "Preencha o prontuário e a senha." };

  const ip = await ipAtual();
  const chaves = [`login:p:${prontuario}`, `login:ip:${ip}`];
  const [porConta, porIp] = await Promise.all([consumir(chaves[0], 8, 15 * 60), consumir(chaves[1], 30, 15 * 60)]);
  if (!porConta || !porIp) return { ok: false, erro: "Muitas tentativas. Aguarde 15 minutos." };

  const p = await autenticarPaciente(prontuario, senha);
  if (!p) return { ok: false, erro: "Prontuário ou senha incorretos." };
  await zerar(chaves[0]);

  await criarSessao({ perfil: "paciente", prontuario: p.prontuario });
  await lembrarProntuario(lembrar === true ? p.prontuario : null);
  return { ok: true, nome: p.nome };
}

export async function entrarCoordenacao(usuario: string, senha: string): Promise<ResultadoLogin> {
  usuario = texto(usuario).trim().toLowerCase();
  senha = texto(senha);
  if (!usuario || !senha) return { ok: false, erro: "Preencha o usuário e a senha." };

  const chave = `login:e:${usuario.slice(0, 40)}`;
  const [porConta, porIp] = await Promise.all([consumir(chave, 5, 15 * 60), consumir(`login:ip:${await ipAtual()}`, 30, 15 * 60)]);
  if (!porConta || !porIp) return { ok: false, erro: "Muitas tentativas. Aguarde 15 minutos." };

  const m = await autenticarEquipe(usuario, senha);
  if (!m) return { ok: false, erro: "Usuário ou senha incorretos." };
  await zerar(chave);

  await criarSessao({ perfil: "coordenacao", usuario: m.usuario, nome: m.nome });
  return { ok: true, nome: m.nome };
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
