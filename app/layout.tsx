import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
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
        <meta httpEquiv="Content-Security-Policy" content="connect-src 'self'; form-action 'self'; base-uri 'self'" />
      </head>
      <body className="bg-surface text-sm leading-relaxed text-ink antialiased">
        <StateProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-20 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
            Skip to content
          </a>
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-surface px-6">
            <span className="text-[17px] font-semibold tracking-tight">Relay</span>
            <span className="text-xs text-ink-2" role="note">
              Illustrative prototype &middot; synthetic data &middot; no model calls
            </span>
          </header>
          <div className="flex min-h-[calc(100vh-3.5rem)]">
            <Nav />
            <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-10 py-10 tabular-nums focus:outline-none">
              <div className="mx-auto max-w-[1200px]">{children}</div>
            </main>
          </div>
        </StateProvider>
      </body>
    </html>
  );
}
