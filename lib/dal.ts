/**
 * Camada de acesso (DAL): toda página e ação protegida passa por aqui.
 * Lê a sessão no servidor e nunca confia no que vem do navegador.
 */
import { redirect } from "next/navigation";
import { sessaoEquipeValida } from "./equipe";
import { sincronizarPaciente } from "./jogo";
import type { PacienteJogo } from "./pacientes";
import { lerSessao } from "./sessao";

/** Para páginas do paciente: devolve o paciente logado (com pendências aplicadas) ou manda ao login. */
export async function pacienteAtual(): Promise<PacienteJogo> {
  const s = await lerSessao();
  if (!s || s.perfil !== "paciente") redirect("/login");
  const p = await sincronizarPaciente(s.prontuario);
  if (!p) redirect("/login");
  return p;
}

/** Para páginas da coordenação. */
export async function coordenadorAtual(): Promise<{ usuario: string; nome: string }> {
  const s = await lerSessao();
  if (!s || s.perfil !== "coordenacao") redirect("/login");
  if (!(await sessaoEquipeValida(s.usuario, s.emitidaEm ?? 0))) redirect("/login");
  return { usuario: s.usuario, nome: s.nome };
}

/** Para server actions do paciente: devolve o prontuário ou null (sem redirecionar). */
export async function prontuarioDaSessao(): Promise<string | null> {
  const s = await lerSessao();
  return s?.perfil === "paciente" ? s.prontuario : null;
}

/** Para server actions da coordenação. */
export async function coordenadorDaSessao(): Promise<{ usuario: string; nome: string } | null> {
  const s = await lerSessao();
  if (s?.perfil !== "coordenacao") return null;
  if (!(await sessaoEquipeValida(s.usuario, s.emitidaEm ?? 0))) return null;
  return { usuario: s.usuario, nome: s.nome };
}
