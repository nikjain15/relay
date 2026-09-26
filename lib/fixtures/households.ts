import type { Household } from "@/lib/types";
import { CLIENTS, toHousehold } from "@/lib/data";

// A view over data/clients/*.json. Edit the data files, not this module.
export const HOUSEHOLDS: Household[] = CLIENTS.map(toHousehold);

export function household(id: string): Household | undefined {
  return HOUSEHOLDS.find((h) => h.id === id);
}
