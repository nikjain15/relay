import { notFound } from "next/navigation";
import { PageTitle, Pill } from "@/components/ui";

const DESIGNED: Record<string, { title: string; body: string }> = {
  pipeline: {
    title: "Pipeline and prospecting",
    body: "Prospects and referral paths ranked by the same materiality and trigger-class model as the book, with held-away assets as the primary signal. Parked because it is not the constraint on conversion (PRD §9.1).",
  },
  onboarding: {
    title: "Onboarding and re-papering",
    body: "Document status, unsigned-item escalation and KYC refresh as a checklist per household, with the supervisory record created as a by-product. Parked for the same reason.",
  },
  servicing: {
    title: "Servicing and operations triage",
    body: "Service requests classified and routed to the client associate with the evidence attached, measured on time to resolution. Parked for the same reason.",
  },
};

export function generateStaticParams() {
  return Object.keys(DESIGNED).map((slug) => ({ slug }));
}

export default async function Designed({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = DESIGNED[slug];
  if (!d) notFound();
  return (
    <>
      <PageTitle title={d.title} />
      <p className="mb-3">
        <Pill>Designed, not built</Pill>
      </p>
      <p className="max-w-2xl">{d.body}</p>
    </>
  );
}
