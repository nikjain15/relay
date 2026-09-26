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
      <body className="bg-surface text-sm leading-relaxed text-ink antialiased">
        <StateProvider>
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-surface px-6">
            <span className="text-[17px] font-semibold tracking-tight">Relay</span>
            <span className="text-xs text-ink-2" role="note">
              Illustrative prototype &middot; synthetic data &middot; no model calls
            </span>
          </header>
          <div className="flex min-h-[calc(100vh-3.5rem)]">
            <Nav />
            <main className="min-w-0 flex-1 px-10 py-10 tabular-nums">
              <div className="mx-auto max-w-[1200px]">{children}</div>
            </main>
          </div>
        </StateProvider>
      </body>
    </html>
  );
}
