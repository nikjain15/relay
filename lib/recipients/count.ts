// FINRA Rule 2210(a): a written communication distributed or made available
// to 25 or fewer retail investors within any 30 calendar-day period is
// correspondence; to more than 25, it is a retail communication.
//
// Three things this counter gets right that a naive one does not:
// 1. It counts PERSONS, not households. A married couple is two retail investors.
// 2. It counts FIRM-WIDE, across every advisor who used the same communication,
//    not per advisor.
// 3. It excludes institutional investors (2210(a)(4)), who are not retail.
//
// Evaluating the trailing window at each send is sufficient: any 30-day period
// holding more than 25 distinct recipients ends on some send date.
//
// Deterministic by design: this module may not import a model client
// (.dependency-cruiser.cjs, rule "deterministic-no-model").

export const RETAIL_THRESHOLD = 25;
export const WINDOW_DAYS = 30;

export type Regime = "correspondence" | "retail communication";

export interface Distribution {
  communicationId: string;
  personId: string;
  advisorId: string;
  institutional: boolean;
  /** Calendar date of distribution, YYYY-MM-DD. */
  date: string;
}

const DAY_MS = 86_400_000;

function dayNumber(isoDate: string): number {
  const ms = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`invalid date: ${isoDate}`);
  return Math.floor(ms / DAY_MS);
}

export function classify(retailRecipients: number): Regime {
  return retailRecipients > RETAIL_THRESHOLD ? "retail communication" : "correspondence";
}

/** Distinct retail recipients of one communication in the 30 calendar days ending on `asOf`. */
export function countRetailRecipients(
  distributions: readonly Distribution[],
  communicationId: string,
  asOf: string,
): number {
  const end = dayNumber(asOf);
  const start = end - (WINDOW_DAYS - 1);
  const people = new Set<string>();
  for (const d of distributions) {
    if (d.communicationId !== communicationId || d.institutional) continue;
    const day = dayNumber(d.date);
    if (day >= start && day <= end) people.add(d.personId);
  }
  return people.size;
}

/** The regime the communication falls under if `proposed` are added on `asOf`. */
export function regimeAfter(
  distributions: readonly Distribution[],
  proposed: readonly Distribution[],
  communicationId: string,
  asOf: string,
): { count: number; regime: Regime } {
  const count = countRetailRecipients([...distributions, ...proposed], communicationId, asOf);
  return { count, regime: classify(count) };
}
