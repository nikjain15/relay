import { notFound } from "next/navigation";
import { household } from "@/lib/fixtures/households";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { ProposalView } from "@/components/proposal-view";

export default async function Proposal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ opp?: string }>;
}) {
  const { id } = await params;
  const { opp } = await searchParams;
  const h = household(id);
  if (!h) notFound();
  const candidates = OPPORTUNITIES.filter((o) => o.householdId === h.id && (o.action === "fund" || o.action === "trim"));
  const chosen = candidates.find((o) => o.id === opp) ?? candidates[0];
  if (!chosen) notFound();
  return <ProposalView householdId={h.id} oppId={chosen.id} others={candidates.map((o) => ({ id: o.id, title: o.title }))} />;
}
