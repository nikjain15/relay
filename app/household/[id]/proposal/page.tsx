import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HOUSEHOLDS, household } from "@/lib/fixtures/households";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { ProposalRoute } from "@/components/proposal-route";

const proposable = (id: string) => OPPORTUNITIES.some((o) => o.householdId === id && (o.action === "fund" || o.action === "trim"));

export function generateStaticParams() {
  return HOUSEHOLDS.filter((h) => proposable(h.id)).map((h) => ({ id: h.id }));
}

export default async function Proposal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = household(id);
  if (!h || !proposable(h.id)) notFound();
  return (
    <Suspense>
      <ProposalRoute householdId={h.id} />
    </Suspense>
  );
}
