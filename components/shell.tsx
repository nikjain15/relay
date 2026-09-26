"use client";

// The application shell: header, navigation, content column.
//
// One responsive decision drives the rest. Below the large breakpoint the
// sidebar becomes a drawer behind a button, because an advisor checking the
// morning list on a phone between meetings needs the content column to have the
// whole screen. The drawer closes on navigation and on Escape, and focus goes to
// it when it opens, so it is usable without a mouse.
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Nav, NavList } from "@/components/nav";

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const drawer = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    drawer.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-30 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="nav-drawer"
          className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded border border-line text-ink lg:hidden"
        >
          <span className="sr-only">{open ? "Close sections" : "Open sections"}</span>
          <span aria-hidden className="text-base leading-none">{open ? "×" : "≡"}</span>
        </button>
        <span className="text-[17px] font-semibold tracking-tight">Relay</span>
        <span className="ml-auto hidden text-xs text-ink-2 sm:inline" role="note">
          Illustrative prototype &middot; synthetic data &middot; no model calls
        </span>
        <span className="ml-auto text-xs text-ink-2 sm:hidden" role="note">Prototype</span>
      </header>

      {open && (
        <div className="fixed inset-0 top-14 z-20 lg:hidden">
          <button type="button" aria-label="Close sections" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/20" />
          <div
            id="nav-drawer"
            ref={drawer}
            tabIndex={-1}
            role="group"
            aria-label="Sections"
            className="relative h-full w-[17rem] max-w-[85%] overflow-y-auto border-r border-line bg-subtle px-4 py-6 focus:outline-none"
          >
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <Nav />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 tabular-nums focus:outline-none sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </>
  );
}
