"use client";

// How to work with this client, resolved through every layer with the source
// of each value. Client component so settings accepted from the learning loop
// this session show immediately.
import Link from "next/link";
import { resolveProfile, sourceLabel } from "@/lib/profile";
import { useRelay } from "@/components/state";
import { Pill } from "@/components/ui";

export function ClientPreferences({ clientId }: { clientId: string }) {
  const { overlay } = useRelay();
  const p = resolveProfile({ clientId }, overlay);
  const v = p.values;
  const row = (label: string, value: string, key: keyof typeof p.provenance) => (
    <li>
      {label}: <strong>{value}</strong> <span className="text-[11px] text-neutral-500">({sourceLabel(p.provenance[key])})</span>
    </li>
  );
  return (
    <div>
      <ul className="space-y-0.5">
        {row("Channel", v["contact.channel"], "contact.channel")}
        {v["contact.window"] && row("Best time", v["contact.window"], "contact.window")}
        {row("Notes", v["note.length"], "note.length")}
        {row("Escalate unsigned forms after", `${v["paperwork.escalateAfterDays"]} days`, "paperwork.escalateAfterDays")}
        {v["contact.callBeforeNote"] && (
          <li>
            <Pill tone="fail">Call first</Pill> Speak to the client before any written note <span className="text-[11px] text-neutral-500">({sourceLabel(p.provenance["contact.callBeforeNote"])})</span>
          </li>
        )}
      </ul>
      <Link className="text-xs text-accent underline" href={`/profiles?client=${clientId}`}>All settings and where they come from</Link>
    </div>
  );
}

/** Orders review-pack sections by the advisor's resolved setting. */
export function OrderedSections({ clientId, sections }: { clientId: string; sections: Record<string, React.ReactNode> }) {
  const { overlay } = useRelay();
  const p = resolveProfile({ clientId }, overlay);
  const order = p.values["review.sectionOrder"];
  return (
    <>
      <p className="mb-2 text-xs text-neutral-600">Section order: {sourceLabel(p.provenance["review.sectionOrder"])}.</p>
      <div className="grid max-w-6xl gap-6 md:grid-cols-2">
        {order.filter((k) => sections[k]).map((k) => (
          <div key={k}>{sections[k]}</div>
        ))}
      </div>
    </>
  );
}
