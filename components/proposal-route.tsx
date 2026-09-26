"use client";

import { useSearchParams } from "next/navigation";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { ProposalView } from "@/components/proposal-view";

// Picks the opportunity from ?opp= in the browser, so the page exports as static HTML (R-22).
export function ProposalRoute({ householdId }: { householdId: string }) {
  const opp = useSearchParams().get("opp");
  const candidates = OPPORTUNITIES.filter((o) => o.householdId === householdId && (o.action === "fund" || o.action === "trim"));
  const chosen = candidates.find((o) => o.id === opp) ?? candidates[0];
  if (!chosen) return <p>No proposals for this client.</p>;
  return <ProposalView key={chosen.id} householdId={householdId} oppId={chosen.id} others={candidates.map((o) => ({ id: o.id, title: o.title }))} />;
}
