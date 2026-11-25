import { cookies } from "next/headers";
import { Suspense } from "react";
import { COOKIE_PRONTUARIO_LEMBRADO } from "@/lib/sessao";
import { FormLogin } from "./FormLogin";

/** Lê o prontuário lembrado neste aparelho (se houver) e preenche o formulário. */
async function Formulario() {
  const salvo = (await cookies()).get(COOKIE_PRONTUARIO_LEMBRADO)?.value;
  return <FormLogin prontuarioSalvo={salvo && /^\d{4}$/.test(salvo) ? salvo : undefined} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<FormLogin />}>
      <Formulario />
    </Suspense>
  );
}
