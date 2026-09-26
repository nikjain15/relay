"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP } from "@/lib/data/policy";

const F = APP.featured;

// Grouped by where each surface sits in the advisor's journey.
const PHASES: { phase: string; links: { href: string; label: string }[] }[] = [
  { phase: "Journey", links: [{ href: "/", label: "Advisor journey" }, { href: "/clients", label: "My clients" }] },
  {
    phase: "Before",
    links: [
      { href: "/pipeline", label: "Finding new clients" },
      { href: "/onboarding", label: "Paperwork" },
    ],
  },
  {
    phase: "Daily work",
    links: [
      { href: "/triage", label: "Today's list" },
      { href: `/evidence/${F.opportunityId}`, label: "Why this client" },
      { href: `/household/${F.clientId}`, label: "Client picture" },
      { href: `/household/${F.clientId}/proposal?opp=${F.opportunityId}`, label: "Options" },
      { href: "/communications", label: "Note and audience" },
      { href: "/supervision", label: "Compliance check" },
    ],
  },
  { phase: "Meetings", links: [{ href: "/meetings", label: "Today's meetings" }] },
  {
    phase: "After",
    links: [
      { href: "/follow-ups", label: "Follow-ups" },
      { href: "/servicing", label: "Service requests" },
      { href: "/measurement", label: "Measurement" },
    ],
  },
  { phase: "Personalization", links: [{ href: "/profiles", label: "Settings" }, { href: "/learning", label: "Suggestions" }] },
  { phase: "Reference", links: [{ href: "/personas", label: "Who's who" }] },
];

export function Nav() {
  const path = usePathname();
  const isActive = (href: string) => {
    const base = href.split("?")[0];
    if (base === "/") return path === "/";
    if (base.startsWith("/household/")) return path.startsWith("/household/") && (base.endsWith("/proposal") ? path.endsWith("/proposal") : !path.endsWith("/proposal"));
    if (base.startsWith("/evidence/")) return path.startsWith("/evidence/");
    if (base === "/meetings") return path.startsWith("/meetings");
    return path === base;
  };
  return (
    <nav aria-label="Surfaces" className="w-60 shrink-0 border-r border-line bg-subtle px-4 py-8 text-[13px]">
      {PHASES.map((g) => (
        <div key={g.phase} className="mb-6">
          <p className="mb-2 px-3 text-xs text-ink-3">{g.phase}</p>
          <ul>
            {g.links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`block border-l-2 px-3 py-1.5 ${isActive(l.href) ? "border-ink font-semibold text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
