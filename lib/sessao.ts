import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/** Lida na hora do uso, para o build não exigir a variável. */
function chave(): Uint8Array {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32)
    throw new Error("SESSION_SECRET ausente ou curta (mínimo 32 caracteres): .env.local no seu computador, Environment Variables na Vercel");
  return new TextEncoder().encode(segredo);
}

const COOKIE = "sessao";
/** Só o número do prontuário, para preencher o login. Nunca guarda senha. */
export const COOKIE_PRONTUARIO_LEMBRADO = "prontuario_lembrado";
const DURACAO_DIAS = 7; // paciente
const DURACAO_HORAS_COORDENACAO = 12;

export type Sessao =
  | { perfil: "paciente"; prontuario: string }
  | { perfil: "coordenacao"; usuario: string; nome: string; emitidaEm?: number };

/** Cria a sessão assinada e grava no cookie (só em server actions). */
export async function criarSessao(dados: Sessao) {
  const ms = dados.perfil === "coordenacao" ? DURACAO_HORAS_COORDENACAO * 60 * 60 * 1000 : DURACAO_DIAS * 24 * 60 * 60 * 1000;
  const expira = new Date(Date.now() + ms);
  const { emitidaEm: _ignorar, ...carga } = dados as Sessao & { emitidaEm?: number };
  void _ignorar;
  const token = await new SignJWT({ ...carga })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expira)
    .sign(chave());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expira,
  });
}

/** Lê e confere a sessão atual. Devolve null se não houver ou se for inválida. */
export async function lerSessao(): Promise<Sessao | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    if (payload.perfil === "coordenacao" && typeof payload.usuario === "string") {
      return { perfil: "coordenacao", usuario: payload.usuario, nome: String(payload.nome ?? payload.usuario), emitidaEm: payload.iat ?? 0 };
    }
    if (typeof payload.prontuario === "string" && /^\d{4}$/.test(payload.prontuario)) {
      return { perfil: "paciente", prontuario: payload.prontuario };
    }
    return null;
  } catch {
    return null;
  }
}

/** Guarda (ou esquece) o nº do prontuário neste aparelho por 1 ano. */
export async function lembrarProntuario(prontuario: string | null) {
  const c = await cookies();
  if (!prontuario) return c.delete(COOKIE_PRONTUARIO_LEMBRADO);
  c.set(COOKIE_PRONTUARIO_LEMBRADO, prontuario, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}
