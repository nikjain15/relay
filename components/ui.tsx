import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
export { CLASS_LABEL, NODE_LABEL } from "@/lib/labels";

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

export function PageTitle({ title, sub, icon }: { title: string; sub?: ReactNode; icon?: IconName }) {
  return (
    <header className="mb-8 flex items-start gap-4">
      {icon && <span className="mt-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-subtle text-ink sm:inline-flex" aria-hidden="true"><Icon name={icon} size={24} /></span>}
      <div className="min-w-0">
        <h1 className="text-[28px] font-light leading-tight tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-2 max-w-3xl text-ink-2">{sub}</p>}
      </div>
    </header>
  );
}

/**
 * A monogram for a vendor or a source: two letters in a tinted square. No
 * logo or wordmark is shipped for any firm; the letters and the name carry
 * the identity, and the name is always printed beside it.
 */
export function Mark({ text, tone = "plain" }: { text: string; tone?: "plain" | "agent" | "advisor" | "client" }) {
  const letters = text.replace(/\(.*?\)/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const cls = { plain: "bg-subtle text-ink border-line", agent: "bg-agent-soft text-agent border-agent/30", advisor: "bg-advisor-soft text-advisor border-advisor/30", client: "bg-client-soft text-client border-client/30" }[tone];
  return <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border text-[12px] font-semibold ${cls}`} aria-hidden="true">{letters}</span>;
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
const base = "inline-flex min-h-8 items-center rounded px-3 py-1 text-left leading-snug text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40";
export const btn = `${base} border border-ink bg-surface text-ink hover:bg-subtle`;
export const btnPrimary = `${base} border border-ink bg-ink text-surface hover:opacity-85`;

// --- Layout primitives added in the UX rebuild ----------------------------
//
// The first build reached for bare divs on every screen, which is why it read as
// one long undifferentiated column. These are the only containers a screen
// should need, and each is responsive by construction so no screen has to
// remember to be.

/** A bordered block with an optional heading and one line of context. */
export function Card({
  title,
  sub,
  right,
  tone = "plain",
  icon,
  children,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  tone?: "plain" | "critical" | "caution" | "positive";
  icon?: IconName;
  children?: ReactNode;
}) {
  const edge = {
    plain: "border-line",
    critical: "border-critical/40 bg-critical-soft",
    caution: "border-caution/40 bg-caution-soft",
    positive: "border-positive/40 bg-positive-soft",
  }[tone];
  return (
    <section className={`rounded border ${edge} p-4 sm:p-5`}>
      {(title || right) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 gap-2.5">
            {icon && <Icon name={icon} size={20} className="mt-px shrink-0 text-ink-3" />}
            <div className="min-w-0">
              {title && <h3 className="text-[14px] font-semibold text-ink">{title}</h3>}
              {sub && <p className="mt-1 text-[13px] text-ink-2">{sub}</p>}
            </div>
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Equal cards that stack on a phone. One column below sm, then `cols`. */
export function CardGrid({ cols = 2, children }: { cols?: 2 | 3 | 4; children: ReactNode }) {
  const at = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return <div className={`grid grid-cols-1 gap-3 ${at}`}>{children}</div>;
}

/** The three or four figures a screen leads with. Readable at phone width. */
export function StatRow({ items }: { items: { value: ReactNode; label: string; tone?: "plain" | "critical" | "positive"; icon?: IconName }[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="rounded border border-line px-3 py-3">
          <div className="flex items-baseline gap-1.5">
            {s.icon && <Icon name={s.icon} size={16} className="translate-y-px text-ink-3" />}
            <p className={`text-xl font-light leading-none ${s.tone === "critical" ? "text-critical" : s.tone === "positive" ? "text-positive" : "text-ink"}`}>{s.value}</p>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-3">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * One line of work: an icon, what it is, and what it needs. The density unit for
 * an agent-first screen, where the system has already done the reading and the
 * person is choosing what to act on.
 */
export function Row({
  icon,
  title,
  meta,
  tone = "plain",
  who,
  right,
  href,
  children,
}: {
  icon?: IconName;
  title: ReactNode;
  meta?: ReactNode;
  tone?: "plain" | "critical" | "caution" | "positive";
  /** Whose line this is: what an agent did, what the advisor must do, what the client said or holds. A stripe and a word. */
  who?: Perspective;
  right?: ReactNode;
  href?: string;
  children?: ReactNode;
}) {
  const accent = { plain: "text-ink-3", critical: "text-critical", caution: "text-caution", positive: "text-positive" }[tone];
  const stripe = who ? { agent: "border-l-2 border-l-agent pl-2", advisor: "border-l-2 border-l-advisor pl-2", client: "border-l-2 border-l-client pl-2" }[who] : "";
  const body = (
    <>
      {icon && <Icon name={icon} size={20} className={`mt-px ${accent}`} />}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] text-ink">{who && <Who who={who} />}{title}</span>
        {meta && <span className="mt-0.5 block text-[12px] text-ink-3">{meta}</span>}
        {children}
      </span>
      {right && <span className="shrink-0 self-center">{right}</span>}
    </>
  );
  return (
    <div className={`border-b border-line last:border-b-0 ${stripe}`}>
      {href ? (
        <Link href={href} className="flex items-start gap-3 px-1 py-3 hover:bg-subtle">{body}</Link>
      ) : (
        <div className="flex items-start gap-3 px-1 py-3">{body}</div>
      )}
    </div>
  );
}

// --- Perspective ----------------------------------------------------------
//
// Three colours say whose line a row is, and nothing else does: what an agent
// read or prepared, what the advisor must decide or send, what the client said,
// holds or will receive. Status colours (positive, caution, critical) stay for
// state. Every use carries the word, never the colour alone.

export type Perspective = "agent" | "advisor" | "client";

export const WHO: Record<Perspective, { word: string; text: string; bg: string; dot: string; border: string }> = {
  agent: { word: "Agent", text: "text-agent", bg: "bg-agent-soft", dot: "bg-agent", border: "border-agent" },
  advisor: { word: "You", text: "text-advisor", bg: "bg-advisor-soft", dot: "bg-advisor", border: "border-advisor" },
  client: { word: "Client", text: "text-client", bg: "bg-client-soft", dot: "bg-client", border: "border-client" },
};

/** A small word in its perspective colour, placed before the line it describes. */
export function Who({ who, label }: { who: Perspective; label?: string }) {
  const w = WHO[who];
  return <span className={`mr-2 inline-flex items-center gap-1 rounded px-1.5 py-px align-middle text-[11px] font-medium ${w.bg} ${w.text}`}><span className={`inline-block h-1.5 w-1.5 rounded-full ${w.dot}`} aria-hidden="true" />{label ?? w.word}</span>;
}

/** The three words and their colours, once per screen where they are used. */
export function Legend({ className = "" }: { className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3 ${className}`} aria-label="Colour legend">
      <Who who="agent" label="Agent read or prepared" />
      <Who who="advisor" label="You decide or send" />
      <Who who="client" label="Client said or holds" />
    </p>
  );
}

/** Long explanation, folded away. A screen states its point and keeps the essay behind this. */
export function More({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="mt-3 text-[13px]">
      <summary className="cursor-pointer text-ink-2 underline decoration-line-strong">{summary}</summary>
      <div className="mt-2 max-w-2xl text-ink-2">{children}</div>
    </details>
  );
}

/** A statement the screen wants read before anything else. */
export function Banner({ tone = "caution", title, children }: { tone?: "critical" | "caution" | "positive"; title: ReactNode; children?: ReactNode }) {
  const cls = {
    critical: "border-critical/40 bg-critical-soft",
    caution: "border-caution/40 bg-caution-soft",
    positive: "border-positive/40 bg-positive-soft",
  }[tone];
  return (
    <div role="note" className={`mb-6 rounded border ${cls} px-4 py-3`}>
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 text-[13px] text-ink-2">{children}</div>}
    </div>
  );
}

/** A labelled form control. Label above on a phone, beside it from sm up. */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block py-2">
      <span className="block text-[13px] font-medium text-ink">{label}</span>
      {hint && <span className="mt-0.5 block text-[12px] text-ink-3">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export const input = "h-9 w-full rounded border border-line-strong bg-surface px-2 text-[13px] text-ink sm:max-w-[16rem]";
export const textarea = "w-full rounded border border-line-strong bg-surface p-2 text-[13px] text-ink";
/** A table that scrolls sideways instead of squeezing, for the few real tables. */
/**
 * A table that becomes a stack of cards below md, so a phone reads each row
 * top to bottom instead of scrolling sideways past the figures that matter.
 * Put `stack.table` on the table element, `stack.head` on its head, `stack.body` on
 * its body, `stack.row` on each row, `stack.cell` on a cell that sits beside the
 * one before it, and `stack.wide` on a cell that takes the whole card width.
 * `stack.label` is a caption shown only on the phone, in place of the header.
 */
export const stack = {
  table: "max-md:block max-md:min-w-0",
  head: "max-md:hidden",
  body: "max-md:block",
  row: "max-md:grid max-md:grid-cols-[auto_1fr] max-md:gap-x-3 max-md:border-b max-md:border-line max-md:py-3",
  cell: "max-md:border-0 max-md:px-0 max-md:py-1",
  wide: "max-md:col-span-2 max-md:border-0 max-md:px-0 max-md:py-1 max-md:text-left",
  label: "mr-1 text-[11px] text-ink-3 md:hidden",
};

export function TableScroll({ children }: { children: ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">{children}</div>;
}

/** A vertical run of events, most recent first: a time, an icon, one line, one line of context. */
export function Timeline({ items }: { items: { at: string; icon: IconName; title: ReactNode; meta?: ReactNode; tone?: "plain" | "critical" | "caution" | "positive"; href?: string }[] }) {
  const accent = { plain: "text-ink-3", critical: "text-critical", caution: "text-caution", positive: "text-positive" };
  return (
    <ol className="relative border-l border-line pl-5">
      {items.map((it, i) => {
        const body = (
          <>
            <span className={`absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface ${accent[it.tone ?? "plain"]}`} aria-hidden="true">
              <Icon name={it.icon} size={16} />
            </span>
            <span className="block text-[11px] tabular-nums text-ink-3">{it.at}</span>
            <span className="block text-[14px] text-ink">{it.title}</span>
            {it.meta && <span className="block text-[12px] text-ink-2">{it.meta}</span>}
          </>
        );
        return (
          <li key={i} className="relative pb-4 last:pb-0">
            {it.href ? <Link href={it.href} className="block hover:underline">{body}</Link> : body}
          </li>
        );
      })}
    </ol>
  );
}

/** One glance: a dot and a word. Never the dot alone. */
export function StateDot({ state }: { state: "clear" | "attention" | "blocked" | "off" }) {
  const cls = { clear: "bg-positive", attention: "bg-caution", blocked: "bg-critical", off: "bg-line-strong" }[state];
  const word = { clear: "Clear", attention: "Needs you", blocked: "Blocking", off: "Off" }[state];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
      <span className={`inline-block h-2 w-2 rounded-full ${cls}`} aria-hidden="true" />
      {word}
    </span>
  );
}

/**
 * How an agent got here, in four or five short steps, folded under a finding.
 * An agent-first screen owes the reader the reasoning on demand, not the
 * conclusion alone: the facts it read, the rule it applied, what it prepared,
 * and who decides. Facts are printed as the rule saw them.
 */
export function Trace({ steps, summary = "How the agent got here" }: { steps: { icon: IconName; title: string; detail?: ReactNode; tone?: "plain" | "critical" | "caution" | "positive"; who?: Perspective }[]; summary?: string }) {
  const accent = { plain: "text-ink-3", critical: "text-critical", caution: "text-caution", positive: "text-positive" };
  return (
    <details className="mt-1.5 text-[12px]">
      <summary className="cursor-pointer text-ink-3 underline decoration-line">{summary}</summary>
      <ol className="mt-2 space-y-1.5 border-l border-line pl-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <Icon name={s.icon} size={16} className={`mt-px shrink-0 ${s.who ? WHO[s.who].text : accent[s.tone ?? "plain"]}`} />
            <span className="min-w-0">
              <span className="text-ink">{i + 1}. {s.who && <Who who={s.who} />}{s.title}</span>
              {s.detail && <span className="block break-words text-ink-2">{s.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}

/**
 * What the agent behind a screen did before anyone opened it, said in one
 * breath: what it read, what it left, and how. Renders as a Brief, so every
 * workflow screen opens the same way: the agent speaks, then the work.
 */
export function AgentBar({ name, icon = "agent", read, left, steps, note, next, at }: {
  name: string;
  icon?: IconName;
  /** What it read, as one phrase: "9 open requests on 3 channels". */
  read: string;
  /** What it left for a person, as short phrases. */
  left: string[];
  steps?: { icon: IconName; title: string; detail?: ReactNode; who?: Perspective }[];
  /** The step a model would own in production, said plainly. */
  note?: string;
  next?: { label: string; href?: string; onClick?: () => void };
  at?: string;
}) {
  const sentence = (x: string) => x.replace(/[.]$/, "");
  return (
    <Brief
      name={name}
      icon={icon}
      at={at}
      says={<>I read {sentence(read)}.{left.length ? ` ${left.map(sentence).map((l, i) => (i === 0 ? l.charAt(0).toUpperCase() + l.slice(1) : l)).join("; ")}.` : ""}</>}
      steps={steps}
      note={note}
      next={next}
    />
  );
}

/**
 * The agent speaks first. Every workflow screen opens with one: who read
 * what, in plain words with the figures in the sentence, the few things that
 * matter today, and the one thing to do next. The tables come after, folded.
 * This is the difference between a dashboard and a colleague's briefing.
 */
export function Brief({ name, icon = "agent", at, says, points = [], next, steps, note }: {
  name: string;
  icon?: IconName;
  /** When it ran, on the prototype clock. */
  at?: string;
  /** One to three sentences in the agent's voice. */
  says: ReactNode;
  /** What matters, worst first. Each one line, optionally a link. */
  points?: { text: ReactNode; href?: string; tone?: "plain" | "critical" | "caution" | "positive"; icon?: IconName; who?: Perspective }[];
  /** The one thing to do next. */
  next?: { label: string; href?: string; onClick?: () => void };
  steps?: { icon: IconName; title: string; detail?: ReactNode; tone?: "plain" | "critical" | "caution" | "positive"; who?: Perspective }[];
  /** The step a model would own in production, said plainly. */
  note?: string;
}) {
  const accent = { plain: "text-ink-3", critical: "text-critical", caution: "text-caution", positive: "text-positive" };
  return (
    <section className="mb-8 rounded-lg border border-agent/30 bg-agent-soft/40 p-4 sm:p-5" aria-label={`${name} agent`}>
      <div className="flex gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-agent-soft text-agent" aria-hidden="true"><Icon name={icon} size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-ink-3"><span className="font-medium text-agent">{name}</span>{at ? ` · ran ${at}` : ""}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink">{says}</p>
          {points.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {points.map((p, i) => {
                const body = (
                  <>
                    <Icon name={p.icon ?? (p.tone === "critical" ? "alert" : p.tone === "caution" ? "question" : p.tone === "positive" ? "check" : "chevron")} size={16} className={`mt-0.5 shrink-0 ${accent[p.tone ?? "plain"]}`} />
                    <span className="min-w-0 text-[13px] text-ink-2">{p.who && <Who who={p.who} />}{p.text}</span>
                  </>
                );
                return <li key={i}>{p.href ? <Link href={p.href} className="flex gap-2 rounded px-1 py-0.5 hover:bg-surface">{body}</Link> : <span className="flex gap-2 px-1 py-0.5">{body}</span>}</li>;
              })}
            </ul>
          )}
          {next && (
            <p className="mt-3">
              {next.href ? <Link href={next.href} className={btnPrimary}>{next.label}</Link> : <button type="button" className={btnPrimary} onClick={next.onClick}>{next.label}</button>}
            </p>
          )}
          {steps && <Trace steps={steps} summary="How I got there" />}
          {note && <p className="mt-2 text-[11px] text-ink-3">{note}</p>}
        </div>
      </div>
    </section>
  );
}
