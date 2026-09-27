"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP } from "@/lib/data/policy";
import { Icon, type IconName } from "@/components/icons";

const F = APP.featured;

export interface NavLink { href: string; label: string; note?: string; icon: IconName }
export interface NavArea { area: string; links: NavLink[] }

/**
 * Six areas, not fourteen groups.
 *
 * The first build listed every surface at one level, which read as a site map
 * rather than a product: an advisor opening it could not tell where the day
 * starts. These are grouped by the question being asked, the day's work first,
 * and on a phone only the current area is expanded.
 */
export const AREAS: NavArea[] = [
  {
    area: "Today",
    links: [
      { href: "/", label: "Overview", icon: "home" },
      { href: "/agents", label: "Agents", note: "What ran, what is left for you", icon: "agent" },
      { href: "/triage", label: "Today's list", note: "What needs a decision", icon: "list" },
      { href: "/meetings", label: "Meetings", icon: "calendar" },
      { href: "/follow-ups", label: "Follow-ups", icon: "check" },
    ],
  },
  {
    area: "Clients",
    links: [
      { href: "/clients", label: "My clients", icon: "people" },
      { href: "/research", label: "Briefings", note: "What you do not yet know", icon: "briefing" },
      { href: "/servicing", label: "Service requests", icon: "clock" },
      { href: `/evidence/${F.opportunityId}`, label: "Why this client", icon: "eye" },
      { href: `/household/${F.clientId}/proposal?opp=${F.opportunityId}`, label: "Options", icon: "filter" },
    ],
  },
  {
    area: "Communications",
    links: [
      { href: "/communications", label: "Note and audience", icon: "email" },
      { href: "/supervision", label: "Supervision queue", icon: "shield" },
    ],
  },
  {
    area: "Compliance",
    links: [
      { href: "/connectors", label: "Connected channels", note: "What is captured", icon: "social" },
      { href: "/compliance", label: "Rules and agents", icon: "rules" },
      { href: "/compliance/log", label: "Change log", icon: "log" },
      { href: "/compliance/replay", label: "Replay", note: "Rules as they stood", icon: "replay" },
      { href: "/documents", label: "Documents", note: "What may be quoted", icon: "library" },
    ],
  },
  {
    area: "Growth",
    links: [
      { href: "/pipeline", label: "New clients", icon: "plus" },
      { href: "/onboarding", label: "Paperwork", icon: "esign" },
      { href: "/discovery", label: "Discovery", note: "What clients said", icon: "search" },
      { href: "/measurement", label: "Measurement", icon: "chart" },
    ],
  },
  {
    area: "Settings",
    links: [
      { href: "/profiles", label: "Preferences", icon: "settings" },
      { href: "/learning", label: "Suggestions", icon: "agent" },
      { href: "/personas", label: "Who's who", icon: "crm" },
      { href: "/data", label: "Connect data", note: "Files stay in the browser", icon: "link" },
    ],
  },
];

export function isActive(href: string, path: string): boolean {
  const base = href.split("?")[0];
  if (base === "/") return path === "/";
  if (base === "/compliance") return path === "/compliance";
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
