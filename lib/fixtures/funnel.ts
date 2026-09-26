// Synthetic weekly funnel for the pilot cohort (PRD §8.2). Illustrative only.
export const FUNNEL: { stage: string; count: number }[] = [
  { stage: "Candidate opportunities generated", count: 4200 },
  { stage: "Surfaced after ranking and cap", count: 1380 },
  { stage: "Opened", count: 910 },
  { stage: "Decided", count: 640 },
  { stage: "Proposal generated", count: 310 },
  { stage: "Proposal accepted", count: 190 },
  { stage: "Communication drafted", count: 160 },
  { stage: "Submitted for supervision", count: 150 },
  { stage: "Dispositioned", count: 142 },
  { stage: "Client contacted", count: 120 },
  { stage: "Outcome recorded", count: 88 },
];
