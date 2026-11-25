import { historico } from "@/lib/mock";
import { LivroOcorrencias } from "./LivroOcorrencias";

export default function HistoricoPage() {
  return <LivroOcorrencias dias={historico} />;
}
