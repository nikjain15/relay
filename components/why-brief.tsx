"use client";

// The first thing "Why this client" says: where this item sits on today's
// list and the arithmetic that put it there, then why it was flagged, in one
// sentence with the figures in it. The rank reads the advisor's resolved
// weights, tuned or not, so it matches Today's list exactly.
import type { Opportunity } from "@/lib/types";
import { rank, score } from "@/lib/ranking/rank";
import { resolveProfile, sourceLabel } from "@/lib/profile";
import { useRelay } from "@/components/state";
import { Brief, CLASS_LABEL } from "@/components/ui";

export function WhyBrief({ opp, clientName, advisorId, supported, conflicts }: {
  opp: Opportunity;
  clientName: string;
  advisorId: string;
  /** Cited passages that support it, and how many documents they come from. */
  supported: { passages: number; docs: number; refused: boolean };
  conflicts: number;
}) {
  const { overlay, dismissed, book } = useRelay();
  const prof = resolveProfile({ advisorId }, overlay);
  const weights = prof.values["triage.classWeights"];
  const w = weights[opp.triggerClass] ?? 1;
  const mine = book.opportunities.filter((o) => book.clients.find((c) => c.id === o.householdId)?.advisorId === advisorId);
  const list = rank(mine, new Set(Object.keys(dismissed)), prof.values["triage.dailyCap"], weights);
  const at = list.findIndex((o) => o.id === opp.id);
  // The reason path without the household node, which the sentence already names.
  const why = opp.reasonPath.filter((n) => n.kind !== "Household").map((n) => n.label).join("; ");
  const proposable = opp.action === "fund" || opp.action === "trim";

  return (
    <Brief
      name="Why this client"
      icon="eye"
      says={<>
        {clientName} is {at >= 0 ? <>number {at + 1} of {list.length} on today&apos;s list</> : dismissed[opp.id] ? "dismissed from today's list" : "below today's cap"}: score {score(opp, weights)} = materiality {opp.materiality} &times; {CLASS_LABEL[opp.triggerClass].toLowerCase()} weight {w.toFixed(2)} ({sourceLabel(prof.provenance["triage.classWeights"]).toLowerCase()}).{" "}
        Flagged on: {why}.{" "}
        {supported.refused ? "No cited document supports it, so nothing here may be quoted." : <>{supported.passages} passage{supported.passages === 1 ? "" : "s"} from {supported.docs} document{supported.docs === 1 ? "" : "s"} support it{conflicts ? `; ${conflicts} source${conflicts === 1 ? " disagrees" : "s disagree"}, shown below` : ""}.</>}
      </>}
      next={proposable ? { label: "See the options", href: `/household/${opp.householdId}/proposal?opp=${opp.id}` } : { label: `Open ${clientName}`, href: `/household/${opp.householdId}` }}
      note="Materiality comes from the agent that raised the item; the weight is yours to tune on Today's list. The ranking and the relevance scores are arithmetic, and a model never reorders either."
    />
  );
}
