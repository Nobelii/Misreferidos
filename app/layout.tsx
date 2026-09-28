import type { Metadata } from "next";
import { Inter, Newsreader, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "MisReferidos — Beneficios que la comunidad comparte",
  description:
    "Descuentos, meses gratis, envíos gratis y códigos útiles compartidos por la comunidad.",
};

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
  axes: ["opsz"],
});

// Serif editorial de los titulares (hero, encabezados de sección, valor de card).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  display: "swap",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Grotesca con carácter para el nav y wordmarks.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${newsreader.variable} ${spaceGrotesk.variable} ${inter.className} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
