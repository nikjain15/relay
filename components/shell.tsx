"use client";

// The application shell: header, navigation, content column.
//
// One responsive decision drives the rest. Below the large breakpoint the
// sidebar becomes a drawer behind a button, because an advisor checking the
// morning list on a phone between meetings needs the content column to have the
// whole screen. The drawer closes on navigation and on Escape, and focus goes to
// it when it opens, so it is usable without a mouse.
import { useEffect, useMemo, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import { Nav, NavList } from "@/components/nav";
import { Icon } from "@/components/icons";
import { Legend } from "@/components/ui";
import { Palette } from "@/components/palette";
import { useRelay } from "@/components/state";
import { policyFrom, agentsFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import { prepareAll } from "@/lib/compliance/actions";
import { APP } from "@/lib/data/policy";

/**
 * What the agents are holding, in the header, on every screen.
 *
 * The point of an agent layer is that it works when nobody is looking at it, so
 * the count belongs where an advisor cannot miss it rather than on one page they
 * have to remember to open. It reads "clear" when it is clear, because a badge
 * that only ever appears when something is wrong teaches people to ignore the
 * space it occupies.
 */
function AgentStatus() {
  const { ruleEdits, connections, caseDispositions, actionDecisions, book } = useRelay();
  const { open, prepared } = useMemo(() => {
    const advisorId = APP.defaultAdvisorId;
    const policy = policyFrom(ruleEdits, scopeFor(advisorId));
    const found = sweep(advisorId, policy, connections, book.clients, agentsFrom(ruleEdits, undefined, scopeFor(advisorId)));
    const open = found.cases.filter((c) => !caseDispositions[c.id]);
    const prepared = prepareAll(open, policy.rules).filter((a) => !actionDecisions[a.id]).length;
    return { open, prepared };
  }, [ruleEdits, connections, caseDispositions, actionDecisions, book.clients]);
  const blocking = open.filter((c) => c.severity === "block" && c.reason === "fired").length;

  return (
    <Link
      href="/agents"
      className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[12px] ${blocking ? "border-critical/40 bg-critical-soft text-critical" : open.length ? "border-line-strong text-ink" : "border-line text-ink-2"}`}
    >
      <Icon name="agent" size={16} />
      <span className="hidden sm:inline">{open.length === 0 ? "Agents clear" : `${open.length} finding${open.length === 1 ? "" : "s"} · ${prepared} prepared`}</span>
      <span className="sm:hidden">{open.length === 0 ? "Clear" : open.length}</span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
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

  // Command or control K opens the palette anywhere, which is the shortcut this
  // class of tool has taught people to reach for.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
          <Icon name={open ? "close" : "menu"} size={20} />
        </button>
        <span className="text-[17px] font-semibold tracking-tight">Relay</span>
        <span className="hidden text-xs text-ink-3 xl:inline" role="note">
          Agents for advisors &middot; synthetic data &middot; no model calls &middot; nothing sent
        </span>

        <Legend className="ml-4 hidden lg:flex" />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[12px] text-ink-2 hover:text-ink"
          >
            <Icon name="search" size={16} />
            <span className="hidden sm:inline">Jump to</span>
          </button>
          <AgentStatus />
        </div>
      </header>

      <Palette open={palette} onClose={() => setPalette(false)} />

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
