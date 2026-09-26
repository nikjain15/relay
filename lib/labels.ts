// Plain-English labels shared by the prototype and the walkthrough mockup
// (scripts/build-walkthrough.ts writes them into walkthrough.json), so the
// menu, the screens and the mockup use the same words.
import type { NodeKind, TriggerClass } from "@/lib/types";

export const CLASS_LABEL: Record<TriggerClass, string> = {
  life_event: "Life event",
  external_event: "Outside event",
  household_threshold: "Over a limit",
  plan_service_event: "Plan or service",
  market_view: "Market view",
};

/** Reason-path node types in words; the typed kind stays in the data and the rationale record. */
export const NODE_LABEL: Record<NodeKind, string> = {
  ExternalEvent: "Outside event",
  LifeEvent: "Life event",
  Threshold: "Limit",
  ServiceEvent: "Service event",
  Publication: "Research",
  Theme: "Theme",
  Household: "Client",
  Goal: "Goal",
  Holding: "Holding",
  Constraint: "Client rule",
};

/** Step names in the order an advisor meets them; the navigation and the mockup both use these. */
export const STEP_LABEL = ["Today's list", "Why this client", "Client picture", "Options", "Note and audience", "Compliance check"] as const;
