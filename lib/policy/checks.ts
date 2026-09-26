// Zero-tolerance checks on a client draft (PRD §8.3). Deterministic: no model
// client may be imported here. Each check returns pass or fail with a reason,
// and the supervision console shows every one.
import { classify, type Regime } from "@/lib/recipients/count";

export interface CheckResult {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

const PROJECTION = /\b(will (return|earn|grow|outperform|yield)|expected return|guarantee[ds]?|projected|target return|\d+(\.\d+)?% (a|per) year)\b/i;
const FIGURE = /\$\d[\d,.]*[MK]?|\d[\d,.]*%|\b\d+ of \d+\b/g;

export function figures(text: string): string[] {
  return text.match(FIGURE) ?? [];
}

export function runChecks(input: {
  draft: string;
  sources: string[];
  citedTitles: string[];
  recipients: number;
  recordedRegime: Regime;
}): CheckResult[] {
  const allowed = new Set(input.sources.flatMap(figures));
  const unsourced = figures(input.draft).filter((f) => !allowed.has(f));
  const cited = input.citedTitles.filter((t) => input.draft.includes(`[Source: ${t}`));
  const expected = classify(input.recipients);
  return [
    {
      id: "no-projection",
      label: "No performance projection",
      pass: !PROJECTION.test(input.draft),
      detail: PROJECTION.test(input.draft) ? `Contains "${input.draft.match(PROJECTION)?.[0]}"` : "No projection language",
    },
    {
      id: "figures-sourced",
      label: "Every figure sourced",
      pass: unsourced.length === 0,
      detail: unsourced.length ? `Unsourced: ${unsourced.join(", ")}` : "All figures trace to the proposal, household or a cited passage",
    },
    {
      id: "citation",
      label: "At least one citation",
      pass: cited.length > 0,
      detail: cited.length ? `Cites ${cited.join("; ")}` : "No cited source",
    },
    {
      id: "regime",
      label: "Supervisory regime matches recipient count",
      pass: input.recordedRegime === expected,
      detail: `${input.recipients} retail investors: ${expected}`,
    },
    {
      id: "disclosure",
      label: "Disclosure present",
      pass: input.draft.includes("not a projection of future performance"),
      detail: input.draft.includes("not a projection of future performance") ? "Standard disclosure included" : "Missing standard disclosure",
    },
  ];
}
