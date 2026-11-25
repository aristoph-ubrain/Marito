import bcrypt from "bcryptjs";
import { banco } from "./db";

// Hash de uma senha qualquer, usado só para igualar o tempo de resposta.
const HASH_FALSO = bcrypt.hashSync("senha-inexistente", 10);

export type MembroEquipe = { usuario: string; nome: string; senhaHash: string; criadoEm: Date; senhaAlteradaEm?: Date };

/** Contas da coordenação são criadas só pelo script `npm run db:equipe`. */
export async function autenticarEquipe(usuario: string, senha: string): Promise<MembroEquipe | null> {
  const col = (await banco()).collection<MembroEquipe>("equipe");
  const m = await col.findOne({ usuario }, { projection: { _id: 0 } });
  if (!m) {
    // Compara mesmo assim para não revelar, pelo tempo de resposta, se o usuário existe.
    await bcrypt.compare(senha, HASH_FALSO);
    return null;
  }
  return (await bcrypt.compare(senha, m.senhaHash)) ? m : null;
}

/** A sessão da coordenação só vale se a conta ainda existe e a senha não mudou depois do login. */
export async function sessaoEquipeValida(usuario: string, emitidaEm: number): Promise<boolean> {
  const col = (await banco()).collection<MembroEquipe>("equipe");
  const m = await col.findOne({ usuario }, { projection: { senhaAlteradaEm: 1 } });
  if (!m) return false;
  return !m.senhaAlteradaEm || emitidaEm >= Math.floor(new Date(m.senhaAlteradaEm).getTime() / 1000);
}
