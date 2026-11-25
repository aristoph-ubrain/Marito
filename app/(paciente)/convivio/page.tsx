import { colegas } from "@/lib/mock";
import { Convivio } from "./Convivio";

export default function ConvivioPage() {
  return <Convivio colegas={colegas} amigosIniciais={["0094", "0121", "0077"]} pedidosIniciais={["0112"]} />;
}
