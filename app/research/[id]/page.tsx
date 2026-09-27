// The briefing: what the advisor does not yet know, before the next conversation.
// Rendering lives in components/research-view.tsx, which reads the session book.
import { notFound } from "next/navigation";
import { CLIENTS } from "@/lib/data";
import { ResearchView } from "@/components/research-view";

export function generateStaticParams() {
  return CLIENTS.map((c) => ({ id: c.id }));
}

export default async function Research({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!CLIENTS.some((c) => c.id === id)) notFound();
  return <ResearchView id={id} />;
}
