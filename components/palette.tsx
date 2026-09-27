"use client";

// Jump to anything, from the keyboard.
//
// Deliberately named "Jump to" and not "Ask". This prototype makes no model
// calls, so a box that looked like a chat would be claiming something the
// product does not do. What it actually is: a deterministic index over the
// surfaces, the advisor's clients, and the compliance rules, matched on substring
// and ranked by where the match lands. That is honest and, for the work an
// advisor does forty times a day, faster than a chat would be.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AREAS } from "@/components/nav";
import { Icon, type IconName } from "@/components/icons";
import { CLIENTS, DOCUMENTS } from "@/lib/data";
import { BASELINE } from "@/lib/compliance/policy";

interface Entry { href: string; label: string; group: string; icon: IconName }

function entries(): Entry[] {
  const out: Entry[] = AREAS.flatMap((a) => a.links.map((l) => ({ href: l.href, label: l.label, group: a.area, icon: l.icon })));
  for (const c of CLIENTS) out.push({ href: `/household/${c.id}`, label: c.name, group: "Client", icon: "document" });
  for (const r of BASELINE) out.push({ href: `/compliance#${r.id}`, label: r.title, group: r.authority, icon: "rules" });
  for (const d of DOCUMENTS) out.push({ href: `/documents/${d.id}`, label: d.title, group: "Document", icon: "quote" });
  for (const c of CLIENTS) out.push({ href: `/research/${c.id}`, label: `${c.name} briefing`, group: "Briefing", icon: "briefing" });
  out.push({ href: "/sources", label: "Connect your book, a tool or a policy", group: "Sources", icon: "link" }, { href: "/discovery", label: "Discovered opportunities", group: "Agent", icon: "search" });
  return out;
}

function rank(e: Entry, q: string): number {
  const l = e.label.toLowerCase();
  if (l === q) return 0;
  if (l.startsWith(q)) return 1;
  if (l.includes(q)) return 2;
  if (e.group.toLowerCase().includes(q)) return 3;
  return -1;
}

export function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const all = useMemo(entries, []);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return all.slice(0, 8);
    return all
      .map((e) => ({ e, r: rank(e, needle) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || a.e.label.localeCompare(b.e.label))
      .slice(0, 10)
      .map((x) => x.e);
  }, [q, all]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      input.current?.focus();
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);

  if (!open) return null;

  const go = (e: Entry | undefined) => {
    if (!e) return;
    onClose();
    router.push(e.href);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center px-4 pt-[12vh]">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/25" />
      <div role="dialog" aria-label="Jump to" aria-modal="true" className="relative w-full max-w-lg rounded border border-line-strong bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Icon name="search" size={20} className="text-ink-3" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); go(hits[sel]); }
              else if (e.key === "Escape") onClose();
            }}
            placeholder="Jump to a screen, a client or a rule"
            aria-label="Jump to a screen, a client or a rule"
            className="h-11 w-full bg-surface text-lead text-ink outline-none"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-caption text-ink-3 sm:block">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {hits.length === 0 && <li className="px-3 py-3 text-body text-ink-2">Nothing matches. This searches surfaces, clients and rules.</li>}
          {hits.map((e, i) => (
            <li key={`${e.href}-${e.label}`}>
              <button
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => go(e)}
                aria-current={i === sel ? "true" : undefined}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-body ${i === sel ? "bg-selected text-ink" : "text-ink-2"}`}
              >
                <Icon name={e.icon} size={16} />
                <span className="min-w-0 flex-1 truncate text-ink">{e.label}</span>
                <span className="shrink-0 text-caption text-ink-3">{e.group}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
