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
      <body className="bg-white text-[13px] text-neutral-900 antialiased">
        <StateProvider>
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-1 text-xs text-amber-900" role="note">
            Illustrative prototype. Synthetic data. No model calls: client language is composed from approved fragments.
          </div>
          <div className="flex min-h-screen">
            <Nav />
            <main className="min-w-0 flex-1 p-5 tabular-nums">{children}</main>
          </div>
        </StateProvider>
      </body>
    </html>
  );
}
