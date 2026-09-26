import type { ReactNode } from "react";
import type { TriggerClass } from "@/lib/types";

export const CLASS_LABEL: Record<TriggerClass, string> = {
  life_event: "Life event",
  external_event: "External event",
  household_threshold: "Household threshold",
  plan_service_event: "Plan or service event",
  market_view: "Market or house view",
};

/** Status label. Text always states the status; colour only reinforces it. */
export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "pass" | "fail" | "accent" }) {
  const cls = {
    neutral: "bg-subtle text-ink-2",
    pass: "bg-positive-soft text-positive",
    fail: "bg-critical-soft text-critical",
    accent: "bg-selected text-ink",
  }[tone];
  return <span className={`inline-block whitespace-nowrap rounded px-1.5 py-px align-middle text-xs font-medium ${cls}`}>{children}</span>;
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-[28px] font-light leading-tight tracking-tight text-ink">{title}</h1>
      {sub && <p className="mt-2 max-w-3xl text-ink-2">{sub}</p>}
    </header>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-[15px] font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** A number with its label, for the few figures a screen leads with. */
export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <strong className="text-2xl font-light text-ink">{value}</strong>
      <span className="text-ink-2">{label}</span>
    </span>
  );
}

export const th = "border-b border-line-strong px-3 py-2 text-left text-xs font-normal text-ink-2";
export const td = "border-b border-line px-3 py-3 align-top";
const base = "inline-flex h-8 items-center rounded px-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40";
export const btn = `${base} border border-ink bg-surface text-ink hover:bg-subtle`;
export const btnPrimary = `${base} border border-ink bg-ink text-surface hover:opacity-85`;
