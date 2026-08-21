import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--fonte-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--fonte-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://simulador-venda-gado.vercel.app"),
  title: {
    default: "Simulador de Venda de Gado",
    template: "%s | Simulador de Venda de Gado",
  },
  description:
    "Compara ofertas de compradores de gado por valor presente liquido por cabeca, nao por preco bruto da arroba.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Simulador de Venda de Gado",
    description:
      "A maior arroba costuma nao ser a melhor oferta. Compare por valor presente liquido por cabeca.",
  },
};

export const viewport: Viewport = {
  themeColor: "#e4e8e3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
