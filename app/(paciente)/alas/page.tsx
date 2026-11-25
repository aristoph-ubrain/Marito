import { alas, paciente as p } from "@/lib/mock";
import { PlantaAlas } from "./PlantaAlas";

export default function AlasPage() {
  return <PlantaAlas alas={alas} nivel={p.nivel} />;
}
