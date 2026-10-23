import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import "@fontsource-variable/fredoka";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iris",
  description: "Voice-first learning games. Talk, sign, or draw your way through three worlds with a friendly buddy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
