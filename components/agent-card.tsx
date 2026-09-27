"use client";

// One agent, explained the same way everywhere: what it is for in one
// sentence, then what it reads, what it checks, what it prepares, when it
// runs and what it never does, then where it stands today.
import type { ReactNode } from "react";
import type { AgentExplanation } from "@/lib/agents/explain";
import { Icon, type IconName } from "@/components/icons";
import { StateDot } from "@/components/ui";

/** The texts an agent is built on, each a link, with any change on the way stated as not yet in force. */
export function Grounded({ exp }: { exp: AgentExplanation }) {
  if (!exp.grounded.length) return <span className="text-ink-3">{exp.groundedNote}</span>;
  const pending = [...new Set(exp.grounded.map((g) => g.pending).filter(Boolean))];
  return (
    <span className="min-w-0">
      {exp.grounded.map((g, i) => (
        <span key={g.url + g.label}>{i > 0 && "; "}<a href={g.url} target="_blank" rel="noreferrer" className="underline decoration-line-strong" title={g.status}>{g.label}</a></span>
      ))}
      {pending.map((p) => <span key={p} className="mt-1 block text-caution">Not yet in force: {p}</span>)}
    </span>
  );
}

export function AgentCard({ name, icon, kind, exp, state, today, actions }: {
  name: string;
  icon: IconName;
  /** "Compliance desk", "Your agent", "Every morning", "When you ask". */
  kind: string;
  exp: AgentExplanation;
  state: "clear" | "attention" | "blocked" | "off";
  /** Where it stands today, one line with the figures in it. */
  today: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded border border-line p-4 sm:p-5" aria-label={name}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <Icon name={icon} size={20} className="mt-px shrink-0 text-agent" />
          <div className="min-w-0">
            <h3 className="text-lead font-semibold text-ink">{name}</h3>
            <p className="text-caption text-ink-3">{kind} · {exp.runs}</p>
          </div>
        </div>
        <StateDot state={state} />
      </header>
      <p className="mt-2 text-body leading-relaxed text-ink">{exp.role}</p>
      <ol className="mt-3 space-y-1.5 text-meta text-ink-2">
        <li className="flex gap-2"><span className="w-16 shrink-0 text-ink-3">Reads</span><span>{exp.reads}</span></li>
        <li className="flex gap-2"><span className="w-16 shrink-0 text-ink-3">Checks</span><span>{exp.checks.join("; ")}</span></li>
        <li className="flex gap-2"><span className="w-16 shrink-0 text-ink-3">Prepares</span><span>{exp.prepares.join("; ")}</span></li>
        <li className="flex gap-2"><span className="w-16 shrink-0 text-ink-3">Never</span><span>{exp.never}</span></li>
        <li className="flex gap-2"><span className="w-16 shrink-0 text-ink-3">How</span><span>{exp.method}</span></li>
        <li className="flex gap-2"><span className="w-16 shrink-0 text-ink-3">Built on</span><Grounded exp={exp} /></li>
      </ol>
      <p className="mt-3 rounded bg-subtle px-2.5 py-1.5 text-meta text-ink">{today}</p>
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </section>
  );
}
