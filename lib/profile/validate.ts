// Checks every profile layer against data/profiles/schema.json: known keys,
// values in bounds, only layers allowed to set a key, rules never looser than
// the firm floor, and every advisor and segment reference resolving.
import { CLIENTS, ADVISORS_DATA } from "@/lib/data";
import { ADVISOR_PROFILES, FIRM, KEYS, SCHEMA, SEGMENTS, checkValue, type Layer, type SettingKey, type Values } from "@/lib/profile";
import { EVENTS } from "@/lib/learning/learn";

export function validateProfiles(): string[] {
  const errors: string[] = [];
  const check = (at: string, layer: Layer, values: Values) => {
    for (const [k, v] of Object.entries(values)) {
      const key = k as SettingKey;
      const spec = SCHEMA[key];
      if (!spec) { errors.push(`${at}: unknown setting ${k}`); continue; }
      if (!spec.layers.includes(layer)) errors.push(`${at}: the ${layer} layer may not set ${k}`);
      const bad = checkValue(key, v);
      if (bad) errors.push(`${at}: ${bad}`);
      if (spec.kind === "rule" && layer !== "firm") {
        const floor = FIRM.values[key];
        const looser = spec.stricter === "lower" ? (v as number) > (floor as number) : spec.stricter === "true" ? floor === true && v !== true : false;
        if (looser) errors.push(`${at}: ${k} would loosen the firm rule (${String(floor)})`);
      }
    }
  };
  for (const key of KEYS) if (SCHEMA[key].type !== "text" && FIRM.values[key] === undefined) errors.push(`firm.json: missing default for ${key}`);
  check("firm.json", "firm", FIRM.values);
  for (const s of SEGMENTS) check(`segment ${s.id}`, "segment", s.values);
  const advisorIds = new Set(ADVISORS_DATA.map((a) => a.id));
  for (const a of ADVISORS_DATA) if (!ADVISOR_PROFILES.some((p) => p.advisorId === a.id)) errors.push(`advisor ${a.id}: no profile in data/profiles/advisors/`);
  for (const p of ADVISOR_PROFILES) {
    if (!advisorIds.has(p.advisorId)) errors.push(`profile ${p.advisorId}: unknown advisor`);
    if (!SEGMENTS.some((s) => s.id === p.segmentId)) errors.push(`profile ${p.advisorId}: unknown segment ${p.segmentId}`);
    check(`advisor profile ${p.advisorId}`, "advisor", p.values);
  }
  for (const c of CLIENTS) {
    if (!c.preferences) { errors.push(`client ${c.id}: missing preferences`); continue; }
    check(`client ${c.id} preferences`, "client", c.preferences.values as Values);
  }
  const clientIds = new Set(CLIENTS.map((c) => c.id));
  for (const e of EVENTS) {
    if (!advisorIds.has(e.advisorId)) errors.push(`event day ${e.day}: unknown advisor ${e.advisorId}`);
    if (e.clientId && !clientIds.has(e.clientId)) errors.push(`event day ${e.day}: unknown client ${e.clientId}`);
    if (e.day > 0) errors.push(`event day ${e.day}: events cannot be in the future`);
  }
  return errors;
}
