import type { Distribution } from "@/lib/recipients/count";

// The date the prototype treats as "today" for the rolling window. A fixed
// synthetic date, so the demo is reproducible.
export const PROTOTYPE_TODAY = "2026-01-30";

export const DEMO_COMMUNICATION = "note-liquidity-review-v1";

// Earlier sends of the same note by a second advisor. Six persons inside the
// 30-day window and three outside it.
export const PRIOR_DISTRIBUTIONS: Distribution[] = [
  ...Array.from({ length: 6 }, (_, i) => ({
    communicationId: DEMO_COMMUNICATION,
    personId: `adv-b-client-${i + 1}`,
    advisorId: "adv-b",
    institutional: false,
    date: "2026-01-12",
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    communicationId: DEMO_COMMUNICATION,
    personId: `adv-b-old-${i + 1}`,
    advisorId: "adv-b",
    institutional: false,
    date: "2025-12-20",
  })),
];
