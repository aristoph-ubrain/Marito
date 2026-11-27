import type { Metadata, Viewport } from "next";
import { Caveat, Courier_Prime, Homemade_Apple, Special_Elite } from "next/font/google";
import "./globals.css";

const specialElite = Special_Elite({
  variable: "--font-special-elite",
  weight: "400",
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  weight: "500",
  subsets: ["latin"],
});

// Caligrafia "de outra pessoa" no diário.
const homemadeApple = Homemade_Apple({
  variable: "--font-homemade-apple",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hospital Marito — Sistema de Registro e Avaliação de Pacientes",
  description: "RPG idle ambientado no Hospital de Saúde Mental Marito.",
};

export const viewport: Viewport = {
  themeColor: "#2a211a",
  // O jogo tem cores próprias (papel velho): pede ao navegador para não aplicar o modo escuro automático.
  colorScheme: "only light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${specialElite.variable} ${courierPrime.variable} ${caveat.variable} ${homemadeApple.variable} h-full antialiased`}
    >
      <head>
        {/* Extensões de modo escuro (ex.: Dark Reader) também respeitam este aviso. */}
        <meta name="darkreader-lock" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
