import type { ReactNode } from "react";
import type { TriggerClass } from "@/lib/types";

export const CLASS_LABEL: Record<TriggerClass, string> = {
  life_event: "Life event",
  external_event: "External event",
  household_threshold: "Household threshold",
  plan_service_event: "Plan or service event",
  market_view: "Market or house view",
};

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "pass" | "fail" | "accent" }) {
  const cls = {
    neutral: "border-neutral-300 text-neutral-700",
    pass: "border-emerald-700 text-emerald-800",
    fail: "border-red-700 text-red-800",
    accent: "border-accent text-accent",
  }[tone];
  return <span className={`inline-block rounded border px-1.5 py-px text-[11px] font-medium ${cls}`}>{children}</span>;
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-lg font-semibold">{title}</h1>
      {sub && <p className="mt-0.5 text-neutral-600">{sub}</p>}
    </header>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}

export const th = "border-b border-neutral-300 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500";
export const td = "border-b border-neutral-200 px-2 py-1.5 align-top";
export const btn =
  "rounded border border-neutral-400 px-2 py-0.5 text-xs hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
export const btnPrimary =
  "rounded border border-accent bg-accent px-2 py-0.5 text-xs text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:opacity-40";
