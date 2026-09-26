import type { Opportunity } from "@/lib/types";
import { ALL_OPPORTUNITIES } from "@/lib/data";

// A view over the opportunities inside data/clients/*.json.
export const OPPORTUNITIES: Opportunity[] = ALL_OPPORTUNITIES;

export function opportunity(id: string): Opportunity | undefined {
  return OPPORTUNITIES.find((o) => o.id === id);
}
