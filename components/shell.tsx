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
import Link from "next/link";
import { Nav, NavList } from "@/components/nav";
import { Icon } from "@/components/icons";
import { Legend } from "@/components/ui";
import { Palette } from "@/components/palette";
import { Ask } from "@/components/ask";
import { useRelay } from "@/components/state";
import { useView } from "@/components/view";
import { ADVISORS_DATA } from "@/lib/data";

/**
 * What the agents are holding, in the header, on every screen.
 *
 * The point of an agent layer is that it works when nobody is looking at it, so
 * the count belongs where an advisor cannot miss it rather than on one page they
 * have to remember to open. It reads "clear" when it is clear, because a badge
 * that only ever appears when something is wrong teaches people to ignore the
 * space it occupies.
 */
/** Who the session is signed in as: one of the prototype's three advisors. Every screen that says "you" follows it. */
function AdvisorSwitch() {
  const { advisorId, setAdvisorId } = useRelay();
  return (
    <label className="flex items-center gap-1.5">
      <span className="hidden text-meta text-ink-3 2xl:inline">Advisor</span>
      <span className="sr-only">Signed in as advisor</span>
      <select
        value={advisorId}
        onChange={(e) => setAdvisorId(e.target.value)}
        className="h-8 max-w-[10.5rem] rounded border border-line bg-surface px-1.5 text-meta text-ink sm:max-w-none"
      >
        {ADVISORS_DATA.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </label>
  );
}

/**
 * Whose day this is, on every page: the advisor persona the session is signed in as, in one line,
 * so nobody has to guess who Margaret or Daniel is. The persona is synthetic; Who's who has the detail.
 */
function Persona() {
  const v = useView();
  const a = v.advisor;
  return (
    <p className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded border border-line bg-subtle px-3 py-2 text-meta text-ink-2" aria-label="Advisor persona">
      <Icon name="people" size={16} className="shrink-0 text-advisor" />
      <span><span className="font-medium text-ink">{a.name}</span>, advisor (synthetic persona)</span>
      <span aria-hidden="true" className="text-ink-3">·</span>
      <span>{a.role}</span>
      <span aria-hidden="true" className="text-ink-3">·</span>
      <span>{a.book}; {v.clients.length} of those households are in this prototype</span>
      <Link href="/personas" className="underline decoration-line-strong">Who&apos;s who</Link>
    </p>
  );
}

function AgentStatus() {
  const v = useView();
  const open = v.openCases;
  const prepared = v.pendingActions.length;
  const blocking = open.filter((c) => c.severity === "block" && c.reason === "fired").length;

  return (
    <Link
      href="/agents"
      className={`flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-1 text-meta ${blocking ? "border-critical/40 bg-critical-soft text-critical" : open.length ? "border-line-strong text-ink" : "border-line text-ink-2"}`}
    >
      <Icon name="agent" size={16} />
      <span className="hidden xl:inline">{open.length === 0 ? "Agents clear" : `${open.length} finding${open.length === 1 ? "" : "s"} · ${prepared} prepared`}</span>
      <span className="xl:hidden">{open.length === 0 ? "Clear" : `${open.length} findings`}</span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [ask, setAsk] = useState(false);
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
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setAsk(true);
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
        <span className="text-brand font-semibold tracking-tight">Relay</span>
        <span className="hidden whitespace-nowrap text-meta leading-4 text-ink-3 2xl:inline" role="note">
          Advice to action, for advisors
        </span>

        <Legend className="ml-2 hidden shrink-0 lg:flex" />
        <div className="ml-auto flex items-center gap-2">
          {/* Ask reads as a place to type, not a small button: it is the fastest path to anything. */}
          <button
            type="button"
            onClick={() => setAsk(true)}
            aria-label="Ask Relay a question"
            className="hidden items-center gap-2 rounded border border-agent/40 bg-agent-soft px-3 py-1.5 text-body text-agent hover:bg-selected sm:flex xl:w-60 2xl:w-80"
          >
            <Icon name="agent" size={16} />
            <span className="xl:hidden">Ask</span>
            <span className="hidden flex-1 truncate whitespace-nowrap text-left xl:inline">Ask about a client, today or a rule</span>
            <kbd className="hidden rounded border border-agent/40 px-1.5 text-caption xl:inline">/</kbd>
          </button>
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-meta text-ink-2 hover:text-ink"
          >
            <Icon name="search" size={16} />
            <span className="hidden whitespace-nowrap xl:inline">Jump to</span>
          </button>
          <AdvisorSwitch />
          <AgentStatus />
        </div>
      </header>

      {/* On a phone the header has no room for a field, so Ask is a labelled button that stays in reach of the thumb. */}
      {!ask && (
        <button
          type="button"
          onClick={() => setAsk(true)}
          className="fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-agent/40 bg-agent-soft px-4 py-2.5 text-lead font-medium text-agent shadow-lg hover:bg-selected sm:hidden"
        >
          <Icon name="agent" size={16} />
          Ask Relay
        </button>
      )}
      <Palette open={palette} onClose={() => setPalette(false)} />
      <Ask open={ask} onClose={() => setAsk(false)} />

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
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-20 pt-6 tabular-nums focus:outline-none sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-[1200px]"><Persona />{children}</div>
        </main>
      </div>
    </>
  );
}
