import { notFound } from "next/navigation";
import { AgentDetail } from "@/components/agent-detail";
import { AGENTS } from "@/lib/compliance/agents";

export function generateStaticParams() {
  return AGENTS.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: AGENTS.find((a) => a.id === id)?.desk ?? "Agent" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!AGENTS.some((a) => a.id === id)) notFound();
  return <AgentDetail agentId={id} />;
}
