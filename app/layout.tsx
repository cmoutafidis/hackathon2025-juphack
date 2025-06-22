import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Solana Voice Assistant - JupHack",
  description: "A voice-controlled Solana wallet and token swap application using Jupiter Swap API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={` antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
