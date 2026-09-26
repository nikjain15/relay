import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { StateProvider } from "@/components/state";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay (illustrative prototype)",
  description: "Advisor advice-to-action layer. Synthetic data only.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="Content-Security-Policy" content="connect-src 'self'; form-action 'self'; base-uri 'self'" />
      </head>
      <body className="bg-surface text-sm leading-relaxed text-ink antialiased">
        <StateProvider>
          <Shell>{children}</Shell>
        </StateProvider>
      </body>
    </html>
  );
}
