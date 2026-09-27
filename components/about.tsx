"use client";

// The four About pages share one frame: a sub-navigation, a three-point
// summary a reader can stop after, and a link to the next page. Each page then
// makes one argument in short sections. The detail lives in the repository
// documents these pages link to.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

export const ABOUT = [
  { href: "/how-it-works", label: "How it works", icon: "sweep" as IconName, blurb: "The loop, every morning" },
  { href: "/features", label: "Features", icon: "list" as IconName, blurb: "Fourteen agents, one gate" },
  { href: "/impact", label: "Impact", icon: "trend" as IconName, blurb: "What changes, measured" },
  { href: "/architecture", label: "Architecture", icon: "planning" as IconName, blurb: "The approach" },
];

export function AboutNav() {
  const path = usePathname();
  return (
    <nav aria-label="About" className="-mt-4 mb-8 flex flex-wrap gap-2">
      {ABOUT.map((p) => {
        const on = path === p.href;
        return (
          <Link key={p.href} href={p.href} aria-current={on ? "page" : undefined} className={`flex items-center gap-2 rounded border px-3 py-1.5 text-[13px] ${on ? "border-ink bg-selected text-ink" : "border-line text-ink-2 hover:bg-subtle hover:text-ink"}`}>
            <Icon name={p.icon} size={16} />
            <span>{p.label}</span>
            <span className="hidden text-[11px] text-ink-3 sm:inline">{p.blurb}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Three sentences a reader can stop after. */
export function Takeaways({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mb-10 grid gap-3 sm:grid-cols-3" aria-label="In three points">
      {items.map((t, i) => (
        <li key={i} className="rounded-lg border border-line bg-subtle p-4">
          <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-surface" aria-hidden="true">{i + 1}</span>
          <p className="text-[14px] leading-relaxed text-ink">{t}</p>
        </li>
      ))}
    </ol>
  );
}

/** A numbered step in a flow: a big number, a title, one line, where to see it. */
export function Step({ n, icon, title, children, href, who }: { n: number; icon: IconName; title: string; children: ReactNode; href?: string; who?: "agent" | "advisor" | "client" }) {
  const tone = { agent: "text-agent bg-agent-soft", advisor: "text-advisor bg-advisor-soft", client: "text-client bg-client-soft" }[who ?? "agent"];
  return (
    <li className="flex gap-4">
      <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`} aria-hidden="true"><Icon name={icon} size={20} /></span>
      <div className="min-w-0 flex-1 border-b border-line pb-4">
        <p className="text-[11px] text-ink-3">Step {n}</p>
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{children}</p>
        {href && <p className="mt-1.5 text-[12px]"><Link href={href} className="underline">See it</Link></p>}
      </div>
    </li>
  );
}

export function NextPage() {
  const path = usePathname();
  const i = ABOUT.findIndex((p) => p.href === path);
  const next = ABOUT[(i + 1) % ABOUT.length];
  return (
    <p className="mt-12 border-t border-line pt-6 text-[14px]">
      <span className="text-ink-3">Next: </span>
      <Link href={next.href} className="underline">{next.label}</Link>
      <span className="text-ink-3">, {next.blurb.toLowerCase()}.</span>
    </p>
  );
}
