// Plain words for setting values, shared by the settings and suggestions screens.
import type { SettingKey } from "@/lib/profile";

const SECTION: Record<string, string> = { changed: "What changed", gaps: "Gaps", decisions: "Decisions", open: "Open items", talking: "Talking points", documents: "Documents" };
const SORT: Record<string, string> = { risk: "lowest risk first", cost: "lowest cost first", access: "fastest access first" };

export function fmtValue(key: SettingKey, v: unknown, detail?: string): string {
  if (v === undefined) return "";
  if (key === "triage.classWeights") {
    const w = v as Record<string, number>;
    if (detail) return `${detail.replace(/_/g, " ")} ${w[detail] ?? v}`;
    return Object.entries(w).map(([k, x]) => `${k.replace(/_/g, " ")} ${x}`).join(", ");
  }
  if (key === "review.sectionOrder") return (v as string[]).map((s) => SECTION[s] ?? s).join(" → ");
  if (key === "proposals.sortBy") return SORT[v as string] ?? String(v);
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}

/** "market view: 0.7 → 0.6" for one weight, "email → call" otherwise. */
export function fmtChange(key: SettingKey, from: unknown, to: unknown, detail?: string): [string, string, string] {
  if (key === "triage.classWeights" && detail) return [`${detail.replace(/_/g, " ")}: `, String(from), String(to)];
  return ["", fmtValue(key, from), fmtValue(key, to)];
}
