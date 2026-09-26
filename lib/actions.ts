// The complete action vocabulary Relay can propose. There is deliberately no
// verb that transmits anything: outbound is a human act (PRD §5.3). The
// invariant test fails the build if a send-like verb is added here.
export const ACTION_VERBS = [
  "review",
  "rebalance",
  "fund",
  "trim",
  "defer",
  "dismiss",
  "draft",
  "submit_for_supervision",
] as const;

export type ActionVerb = (typeof ACTION_VERBS)[number];
