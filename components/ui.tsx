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
  right,
  href,
  children,
}: {
  icon?: IconName;
  title: ReactNode;
  meta?: ReactNode;
  tone?: "plain" | "critical" | "caution" | "positive";
  right?: ReactNode;
  href?: string;
  children?: ReactNode;
}) {
  const accent = { plain: "text-ink-3", critical: "text-critical", caution: "text-caution", positive: "text-positive" }[tone];
  const body = (
    <>
      {icon && <Icon name={icon} size={20} className={`mt-px ${accent}`} />}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] text-ink">{title}</span>
        {meta && <span className="mt-0.5 block text-[12px] text-ink-3">{meta}</span>}
        {children}
      </span>
      {right && <span className="shrink-0 self-center">{right}</span>}
    </>
  );
  return (
    <div className="border-b border-line last:border-b-0">
      {href ? (
        <a href={href} className="flex items-start gap-3 px-1 py-3 hover:bg-subtle">{body}</a>
      ) : (
        <div className="flex items-start gap-3 px-1 py-3">{body}</div>
      )}
    </div>
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
export function TableScroll({ children }: { children: ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">{children}</div>;
}
