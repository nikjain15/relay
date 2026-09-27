// Small charts, built from data/ and drawn with the design tokens.
//
// Three forms and no more: a bar list for a distribution across categories, a
// stacked meter for shares of one whole, and a sparkline for one series over
// time. Each is monochrome ink unless a segment carries a status, in which case
// the status colour appears with the word that names it (design system
// principle 3). Every value is also printed as text, so nothing here is read by
// colour or by eye alone, and a screen reader gets the numbers.
import type { ReactNode } from "react";

type Tone = "plain" | "critical" | "caution" | "positive" | "muted";
const BAR: Record<Tone, string> = { plain: "bg-ink", critical: "bg-critical", caution: "bg-caution", positive: "bg-positive", muted: "bg-line-strong" };
const TEXT: Record<Tone, string> = { plain: "text-ink", critical: "text-critical", caution: "text-caution", positive: "text-positive", muted: "text-ink-3" };

export interface BarItem {
  label: ReactNode;
  value: number;
  /** Printed beside the bar; defaults to the value. */
  display?: string;
  tone?: Tone;
  href?: string;
}

/** A distribution across categories: label, thin bar, number. Sorted by the caller. */
export function Bars({ items, max, ariaLabel }: { items: BarItem[]; max?: number; ariaLabel: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-1.5" aria-label={ariaLabel}>
      {items.map((it, i) => {
        const w = Math.max(it.value > 0 ? 2 : 0, Math.round((it.value / top) * 100));
        const label = <span className="truncate text-[13px] text-ink">{it.label}</span>;
        return (
          <li key={i} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3">
            {it.href ? <a href={it.href} className="truncate text-[13px] text-ink underline decoration-line-strong hover:decoration-ink">{it.label}</a> : label}
            <span className="h-1.5 w-full rounded bg-subtle" aria-hidden="true">
              <span className={`block h-1.5 rounded ${BAR[it.tone ?? "plain"]}`} style={{ width: `${w}%` }} />
            </span>
            <span className={`text-right text-[13px] tabular-nums ${TEXT[it.tone ?? "plain"]}`}>{it.display ?? it.value}</span>
          </li>
        );
      })}
    </ul>
  );
}

export interface Segment {
  label: string;
  value: number;
  tone?: Tone;
}

/** Shares of one whole, as one thin stacked bar with a 2px gap between segments and a worded legend. */
export function Meter({ segments, ariaLabel }: { segments: Segment[]; ariaLabel: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const shown = segments.filter((s) => s.value > 0);
  return (
    <div aria-label={ariaLabel}>
      <div className="flex h-2 w-full gap-0.5" aria-hidden="true">
        {shown.map((s, i) => (
          <span key={i} className={`h-2 rounded ${BAR[s.tone ?? "plain"]}`} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded ${BAR[s.tone ?? "plain"]}`} aria-hidden="true" />
            <span className="text-ink-2">{s.label}</span>
            <span className={`tabular-nums ${TEXT[s.tone ?? "plain"]}`}>{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One series over time, 2px line, end marker, optional ceiling. The numbers
 * are printed under it: the picture shows the shape and the text carries the
 * values, so the two cannot disagree.
 */
export function Sparkline({
  points,
  labels,
  ceiling,
  ceilingLabel,
  format = (n) => String(n),
  tone = "plain",
  ariaLabel,
}: {
  points: number[];
  labels?: string[];
  ceiling?: number;
  ceilingLabel?: string;
  format?: (n: number) => string;
  tone?: Tone;
  ariaLabel: string;
}) {
  const W = 160, H = 40, PAD = 4;
  const all = ceiling !== undefined ? [...points, ceiling] : points;
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || 1;
  const x = (i: number) => PAD + (i / Math.max(1, points.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - ((v - lo) / span) * (H - 2 * PAD);
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <figure aria-label={ariaLabel} className="inline-block">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={TEXT[tone]} aria-hidden="true" focusable="false">
        {ceiling !== undefined && (
          <line x1={PAD} x2={W - PAD} y1={y(ceiling)} y2={y(ceiling)} stroke="currentColor" strokeWidth={1} strokeDasharray="3 3" className="text-ink-3" />
        )}
        <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(points.length - 1)} cy={y(last)} r={3.5} fill="currentColor" />
      </svg>
      <figcaption className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] tabular-nums text-ink-3">
        {points.map((v, i) => (
          <span key={i}>{labels?.[i] ? `${labels[i]} ` : ""}<span className={i === points.length - 1 ? TEXT[tone] : ""}>{format(v)}</span></span>
        ))}
        {ceiling !== undefined && <span>{ceilingLabel ?? "ceiling"} {format(ceiling)}</span>}
      </figcaption>
    </figure>
  );
}
