// Personalization (BUILD-SPEC §5.3, R-19). One function answers "what are the
// effective settings for this advisor and this client, and who set each one?"
// Every screen asks resolveProfile(); no screen reads a profile file directly,
// so the store behind it (JSON today, a settings service in production) can
// change without touching a screen or an engine.
import schema from "@/data/profiles/schema.json";
import firm from "@/data/profiles/firm.json";
import segments from "@/data/profiles/segments.json";
import { ADVISORS_DATA, CLIENTS } from "@/lib/data";
import type { TriggerClass } from "@/lib/types";

export type Layer = "firm" | "segment" | "advisor" | "client";
export type SettingKey = keyof typeof schema.settings;
export interface SettingSpec {
  label: string;
  kind: "preference" | "rule";
  type: "number" | "enum" | "weights" | "order" | "boolean" | "text";
  min?: number;
  max?: number;
  values?: string[];
  stricter?: "lower" | "true";
  layers: Layer[];
}
export type Values = Partial<Record<SettingKey, unknown>>;
export interface Effective {
  "triage.dailyCap": number;
  "triage.classWeights": Record<TriggerClass, number>;
  "proposals.sortBy": "risk" | "cost" | "access";
  "review.sectionOrder": string[];
  "note.length": "full" | "brief";
  "contact.channel": "email" | "call" | "video" | "portal";
  "contact.window"?: string;
  "paperwork.escalateAfterDays": number;
  "contact.callBeforeNote": boolean;
}
export interface AdvisorProfile { advisorId: string; segmentId: string; version: number; learning: boolean; values: Values }
export interface Segment { id: string; label: string; version: number; values: Values }
/** Values accepted from the learning loop this session, keyed by advisor or client id. */
export interface Overlay { advisor?: Record<string, Values>; client?: Record<string, Values> }

export const SCHEMA = schema.settings as unknown as Record<SettingKey, SettingSpec>;
export const KEYS = Object.keys(SCHEMA) as SettingKey[];
export const FIRM = firm as unknown as { version: number; values: Values };
export const SEGMENTS = segments as unknown as Segment[];
/** One settings profile per advisor, read from the `profile` block of data/advisors/<id>.json. */
export const ADVISOR_PROFILES: AdvisorProfile[] = ADVISORS_DATA.map((a) => ({ advisorId: a.id, ...(a.profile ?? { segmentId: "private-wealth", version: 1, learning: true, values: {} }) }));

interface Source { layer: Layer; id: string; version: number; values: Values; learned?: boolean }

function stack(advisorId: string | undefined, clientId: string | undefined, overlay: Overlay): Source[] {
  const client = clientId ? CLIENTS.find((c) => c.id === clientId) : undefined;
  const aid = advisorId ?? client?.advisorId;
  const ap = ADVISOR_PROFILES.find((a) => a.advisorId === aid);
  const seg = ap ? SEGMENTS.find((s) => s.id === ap.segmentId) : undefined;
  const out: Source[] = [{ layer: "firm", id: "firm", version: FIRM.version, values: FIRM.values }];
  if (seg) out.push({ layer: "segment", id: seg.id, version: seg.version, values: seg.values });
  if (ap) {
    out.push({ layer: "advisor", id: ap.advisorId, version: ap.version, values: ap.values });
    const o = overlay.advisor?.[ap.advisorId];
    if (o) out.push({ layer: "advisor", id: ap.advisorId, version: ap.version, values: o, learned: true });
  }
  if (client) {
    out.push({ layer: "client", id: client.id, version: client.preferences?.version ?? 0, values: (client.preferences?.values ?? {}) as Values });
    const o = overlay.client?.[client.id];
    if (o) out.push({ layer: "client", id: client.id, version: client.preferences?.version ?? 0, values: o, learned: true });
  }
  return out;
}

const tighter = (spec: SettingSpec, a: unknown, b: unknown) =>
  spec.stricter === "lower" ? (b as number) < (a as number) : spec.stricter === "true" ? b === true && a !== true : false;

export interface Resolved {
  values: Effective;
  /** Who set each value, e.g. "firm", "segment:wealth-advice-center", "advisor:adv-a (learned)". */
  provenance: Record<SettingKey, string>;
  /** Lower-layer values ignored because they would loosen a rule or the layer may not set the key. */
  ignored: string[];
  /** Recorded on every rationale record so a decision can be reproduced. */
  version: string;
}

export function resolveProfile(scope: { advisorId?: string; clientId?: string }, overlay: Overlay = {}): Resolved {
  const layers = stack(scope.advisorId, scope.clientId, overlay);
  const values: Record<string, unknown> = {};
  const provenance = {} as Record<SettingKey, string>;
  const ignored: string[] = [];
  const tag = (s: Source) => (s.layer === "firm" ? "firm" : `${s.layer}:${s.id}`) + (s.learned ? " (learned)" : "");
  for (const key of KEYS) {
    const spec = SCHEMA[key];
    for (const s of layers) {
      const v = s.values[key];
      if (v === undefined) continue;
      if (!spec.layers.includes(s.layer)) {
        ignored.push(`${tag(s)} may not set ${key}`);
        continue;
      }
      // Out-of-bounds or malformed values never take effect, whichever layer or overlay supplies them.
      const bad = checkValue(key, v);
      if (bad) {
        ignored.push(`${tag(s)} ignored: ${bad}`);
        continue;
      }
      if (values[key] === undefined) {
        values[key] = spec.type === "weights" ? { ...(v as object) } : v;
      } else if (spec.kind === "rule") {
        if (tighter(spec, values[key], v)) values[key] = v;
        else if (values[key] !== v) {
          ignored.push(`${tag(s)} would loosen ${key}`);
          continue;
        } else continue;
      } else {
        values[key] = spec.type === "weights" ? { ...(values[key] as object), ...(v as object) } : v;
      }
      provenance[key] = tag(s);
    }
  }
  const version = layers.map((s) => `${s.layer === "firm" ? "firm" : `${s.layer}:${s.id}`}@${s.version}${s.learned ? "+learned" : ""}`).join(" ");
  return { values: values as unknown as Effective, provenance, ignored, version };
}

const LAYER_LABEL: Record<Layer, string> = { firm: "Firm default", segment: "Segment", advisor: "Advisor", client: "Client" };

/** Plain words for a provenance tag, for screens. */
export function sourceLabel(p: string | undefined): string {
  if (!p) return "Not set";
  const learned = p.endsWith(" (learned)");
  const [layer, id] = p.replace(" (learned)", "").split(":") as [Layer, string?];
  const seg = layer === "segment" ? SEGMENTS.find((s) => s.id === id)?.label : undefined;
  const base = layer === "segment" ? `${LAYER_LABEL.segment}: ${seg ?? id}` : layer === "firm" ? LAYER_LABEL.firm : `${LAYER_LABEL[layer]} setting`;
  return learned ? `${base}, learned and accepted` : base;
}

/** Checks one value against its spec. Used by validate() and by the learning loop. */
export function checkValue(key: SettingKey, v: unknown): string | undefined {
  const s = SCHEMA[key];
  if (!s) return `unknown setting ${key}`;
  switch (s.type) {
    case "number":
      if (typeof v !== "number" || !Number.isFinite(v) || (s.min !== undefined && v < s.min) || (s.max !== undefined && v > s.max)) return `${key} must be a number from ${s.min} to ${s.max}`;
      return;
    case "enum":
      if (!s.values!.includes(v as string)) return `${key} must be one of ${s.values!.join(", ")}`;
      return;
    case "boolean":
      if (typeof v !== "boolean") return `${key} must be true or false`;
      return;
    case "text":
      if (typeof v !== "string" || !v) return `${key} must be text`;
      return;
    case "order": {
      const a = v as string[];
      if (!Array.isArray(a) || a.length !== s.values!.length || [...a].sort().join() !== [...s.values!].sort().join()) return `${key} must list each of ${s.values!.join(", ")} once`;
      return;
    }
    case "weights":
      if (!v || typeof v !== "object" || Array.isArray(v)) return `${key} must map each class to a weight`;
      for (const [k, w] of Object.entries(v as Record<string, number>)) {
        if (s.values && !s.values.includes(k)) return `${key} has unknown class ${k}`;
        if (typeof w !== "number" || !Number.isFinite(w) || w < s.min! || w > s.max!) return `${key}.${k} must be from ${s.min} to ${s.max}`;
      }
      return;
  }
}
