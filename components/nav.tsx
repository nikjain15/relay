"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP } from "@/lib/data/policy";
import { Icon, type IconName } from "@/components/icons";

const F = APP.featured;

export interface NavLink { href: string; label: string; note?: string; icon: IconName }
export interface NavArea { area: string; links: NavLink[] }

/**
 * Six areas, in the order an advisor's day runs.
 *
 * The first build listed every surface at one level, which read as a site map.
 * The second grouped by the advisor's day, which read as a CRM with an agent
 * bolted on. The third grouped by what the system is, which read as a console.
 * This one is grouped by what the advisor does: today's decisions, the agents
 * that prepared them, the households, the sources they read, the rules they run
 * under, and the pages that explain it all. On a phone only the current area
 * is expanded.
 */
export const AREAS: NavArea[] = [
  {
    area: "Today",
    links: [
      { href: "/", label: "Overview", note: "What needs you, in order", icon: "home" },
      { href: "/triage", label: "Today's list", note: "One decision per row", icon: "list" },
      { href: "/supervision", label: "Supervision queue", note: "Findings and prepared actions", icon: "shield" },
      { href: "/meetings", label: "Meetings", note: "Review packs, built", icon: "calendar" },
      { href: "/communications", label: "Note and audience", note: "The counter sets the regime", icon: "email" },
      { href: "/follow-ups", label: "Follow-ups", icon: "check" },
    ],
  },
  {
    area: "Agents",
    links: [
      { href: "/agents", label: "Agent status", note: "Every desk, tune it, teach it", icon: "agent" },
      { href: "/simulate", label: "Before you act", note: "The morning after, first", icon: "hourglass" },
      { href: "/discovery", label: "Discovery", note: "What clients said", icon: "search" },
      { href: "/research", label: "Briefings", note: "What you do not yet know", icon: "briefing" },
      { href: "/documents", label: "Retrieval", note: "What may be quoted", icon: "library" },
      { href: "/learning", label: "Suggestions", note: "Proposed, never applied", icon: "trend" },
    ],
  },
  {
    area: "Households",
    links: [
      { href: "/clients", label: "Households", note: "Research any of them", icon: "people" },
      { href: "/servicing", label: "Service requests", icon: "clock" },
      { href: `/evidence/${F.opportunityId}`, label: "Why this client", note: "The reason path, cited", icon: "eye" },
      { href: `/household/${F.clientId}/proposal?opp=${F.opportunityId}`, label: "Options", note: "Compared, then the morning after", icon: "filter" },
      { href: "/pipeline", label: "Prospects", icon: "plus" },
      { href: "/onboarding", label: "Paperwork", icon: "esign" },
    ],
  },
  {
    area: "Sources",
    links: [
      { href: "/sources", label: "Sources", note: "Your book, your tools, your policies", icon: "link" },
      { href: "/personas", label: "Who's who", icon: "crm" },
    ],
  },
  {
    area: "Rules",
    links: [
      { href: "/compliance", label: "Rules and desks", note: "Tighten only", icon: "rules" },
      { href: "/compliance/log", label: "Change log", icon: "log" },
      { href: "/compliance/replay", label: "Replay", note: "Rules as they stood", icon: "replay" },
      { href: "/profiles", label: "Preferences", icon: "settings" },
      { href: "/measurement", label: "Measurement", icon: "chart" },
    ],
  },
  {
    area: "About",
    links: [
      { href: "/how-it-works", label: "How it works", icon: "sweep" },
      { href: "/features", label: "Features", icon: "list" },
      { href: "/impact", label: "Impact", icon: "trend" },
      { href: "/architecture", label: "Architecture", icon: "planning" },
    ],
  },
];

export function isActive(href: string, path: string): boolean {
  const base = href.split("?")[0];
  if (base === "/") return path === "/";
  if (base === "/compliance") return path === "/compliance";
  if (base === "/agents") return path === "/agents" || path.startsWith("/agents/");
  if (base.startsWith("/household/")) {
    if (!path.startsWith("/household/")) return false;
    return base.endsWith("/proposal") ? path.endsWith("/proposal") : !path.endsWith("/proposal");
  }
  if (base.startsWith("/evidence/")) return path.startsWith("/evidence/");
  if (base === "/research") return path.startsWith("/research");
  if (base === "/documents") return path.startsWith("/documents");
  if (base === "/meetings") return path.startsWith("/meetings");
  return path === base;
}

/** The area containing the current route, so a phone opens on the right one. */
export function currentArea(path: string): string {
  return AREAS.find((a) => a.links.some((l) => isActive(l.href, path)))?.area ?? AREAS[0].area;
}

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const here = currentArea(path);
  return (
    <div className="text-[13px]">
      {AREAS.map((g) => {
        const isHere = g.area === here;
        return (
          <div key={g.area} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{g.area}</p>
            <ul>
              {g.links.map((l) => {
                const active = isActive(l.href, path);
                // On a phone, an area that is not the current one shows only its
                // first link, so the drawer is a short list rather than a wall.
                const collapsed = !isHere && l !== g.links[0];
                return (
                  <li key={l.href} className={collapsed ? "hidden sm:block" : undefined}>
                    <Link
                      href={l.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-start gap-2.5 border-l-2 px-3 py-2 sm:py-1.5 ${active ? "border-ink bg-selected font-semibold text-ink" : "border-transparent text-ink-2 hover:bg-subtle hover:text-ink"}`}
                    >
                      <Icon name={l.icon} size={16} className="mt-px" />
                      <span className="min-w-0">
                        {l.label}
                        {l.note && active && <span className="mt-0.5 block text-[11px] font-normal text-ink-3">{l.note}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function Nav() {
  return (
    <nav aria-label="Sections" className="hidden w-60 shrink-0 border-r border-line bg-subtle px-4 py-8 lg:block">
      <NavList />
    </nav>
  );
}
