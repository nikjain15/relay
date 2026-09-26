import type { Distribution } from "@/lib/recipients/count";
import { COMMUNICATIONS } from "@/lib/data";

// From data/communications.json: the fixed synthetic "today" for the rolling
// window, and earlier sends of the demo note by a second advisor.
export const PROTOTYPE_TODAY = COMMUNICATIONS.prototypeToday;
export const DEMO_COMMUNICATION = COMMUNICATIONS.demoCommunication;
export const PRIOR_DISTRIBUTIONS: Distribution[] = COMMUNICATIONS.priorDistributions;
