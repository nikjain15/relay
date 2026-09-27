import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { ViewProvider } from "@/components/view";
import { StateProvider } from "@/components/state";
import "./globals.css";

export const metadata: Metadata = {
  // Every page names itself in the navigation's words; the tab reads "Page · Relay".
  title: { default: "Relay (illustrative prototype)", template: "%s · Relay" },
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
      <body className="bg-surface text-lead leading-relaxed text-ink antialiased">
        <StateProvider>
          <ViewProvider>
            <Shell>{children}</Shell>
          </ViewProvider>
        </StateProvider>
      </body>
    </html>
  );
}
