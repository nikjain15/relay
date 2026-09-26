import type { Source } from "@/lib/types";

// Cited composites (docs/PERSONAS.md). No real advisor is the persona; the
// public team pages are evidence that practices of this kind exist.
export interface Advisor {
  id: string;
  name: string;
  role: string;
  book: string;
  facts: { detail: string; kind: "Published" | "Derived" | "Chosen" }[];
  groundedIn: Source[];
  walkthrough?: {
    label: string;
    day: string;
    households: number | string;
    alertsOvernight: number;
    summary: string;
    meetings: [string, string][];
  };
}
