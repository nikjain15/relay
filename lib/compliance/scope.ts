// Which layers apply to one advisor, resolved from data rather than named in a
// screen. The console needs both the ids (to record an edit against the right
// layer) and the labels (to say whose setting it is), and a new segment or
// advisor must not require a code change to appear here.
import { ADVISOR_PROFILES, SEGMENTS } from "@/lib/profile";
import { ADVISORS_DATA } from "@/lib/data";
import type { RuleLayer } from "@/lib/compliance/policy";

export interface EditableLayer {
  layer: RuleLayer;
  id: string;
  label: string;
}

export interface PolicyScope {
  segmentId?: string;
  advisorId: string;
  /** Firm, then this advisor's segment, then the advisor. Client layer is per client. */
  layers: EditableLayer[];
}

export function scopeFor(advisorId: string): PolicyScope {
  const profile = ADVISOR_PROFILES.find((p) => p.advisorId === advisorId);
  const segment = profile ? SEGMENTS.find((s) => s.id === profile.segmentId) : undefined;
  const advisor = ADVISORS_DATA.find((a) => a.id === advisorId);
  const layers: EditableLayer[] = [{ layer: "firm", id: "firm", label: "Firm" }];
  if (segment) layers.push({ layer: "segment", id: segment.id, label: `Segment: ${segment.label}` });
  layers.push({ layer: "advisor", id: advisorId, label: advisor?.name ?? advisorId });
  return { segmentId: segment?.id, advisorId, layers };
}
