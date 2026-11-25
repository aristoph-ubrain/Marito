import { CabecalhoPaciente } from "@/components/Cabecalho";
import { Papel } from "@/components/ui";

export default function LayoutPaciente({ children }: { children: React.ReactNode }) {
  return (
    <Papel>
      <CabecalhoPaciente />
      {children}
    </Papel>
  );
}
