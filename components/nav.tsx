"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BUILT = [
  { href: "/triage", label: "Book triage", n: 6 },
  { href: "/household/hh-renner", label: "Household advice state", n: 3 },
  { href: "/evidence/opp-renner-property", label: "Evidence and explain", n: 4 },
  { href: "/household/hh-renner/proposal?opp=opp-renner-concentration", label: "Action proposals", n: 5 },
  { href: "/communications", label: "Client communications", n: 7 },
  { href: "/supervision", label: "Supervision console", n: 9 },
  { href: "/measurement", label: "Measurement", n: 0 },
  { href: "/personas", label: "Who's who", n: 0 },
];
const DESIGNED = [
  { href: "/designed/pipeline", label: "Pipeline and prospecting", n: 1 },
  { href: "/designed/onboarding", label: "Onboarding and re-papering", n: 2 },
  { href: "/designed/servicing", label: "Servicing and operations", n: 8 },
];

export function Nav() {
  const path = usePathname();
  const item = (l: { href: string; label: string; n: number }, designed = false) => {
    const active = path === l.href.split("?")[0];
    return (
      <li key={l.href}>
        <Link
          href={l.href}
          aria-current={active ? "page" : undefined}
          className={`block rounded px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? "bg-neutral-200 font-medium" : "hover:bg-neutral-100"} ${designed ? "text-neutral-500" : ""}`}
        >
          {l.label}
          {designed && <span className="block text-[10px] uppercase tracking-wide">designed, not built</span>}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Surfaces" className="w-56 shrink-0 border-r border-neutral-200 p-3 text-[13px]">
      <p className="mb-3 px-2 text-sm font-semibold">Relay</p>
      <ul className="space-y-0.5">{BUILT.map((l) => item(l))}</ul>
      <p className="mb-1 mt-4 px-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Designed</p>
      <ul className="space-y-0.5">{DESIGNED.map((l) => item(l, true))}</ul>
    </nav>
  );
}
