import Link from "next/link";
import { ADVISORS_DATA } from "@/lib/data";
import { todaysMeetings, prospectFor, clientName } from "@/lib/meetings/prep";
import { APP } from "@/lib/data/policy";
import { PageTitle, Pill, Section } from "@/components/ui";

const KIND: Record<string, string> = { call: "Client call", review: "Client review", prospect: "Prospect", internal: "Internal", queue: "Callbacks" };

export default function Meetings() {
  return (
    <>
      <PageTitle title="Today's meetings" sub={`${APP.todayLabel}. Each client meeting has a review pack built from the client file.`} />
      {ADVISORS_DATA.map((a) => (
        <Section key={a.id} title={a.walkthrough?.label ?? a.name}>
          <ol className="grid max-w-4xl gap-2">
            {todaysMeetings(a.id).map((m) => {
              const p = prospectFor(m);
              return (
                <li key={m.time} className="grid grid-cols-[4rem_1fr_auto] items-start gap-3 rounded border border-line p-3">
                  <span className="font-semibold">{m.time}</span>
                  <span>
                    <span className="font-medium">{m.title}</span> <Pill>{KIND[m.kind]}</Pill>
                    <span className="block text-ink-2">{m.purpose}</span>
                    {p && <span className="block text-xs text-ink-2">Prospect: {p.label}. {p.signal}</span>}
                  </span>
                  <span>
                    {m.clientId ? (
                      <>
                        <Link className="text-accent underline" href={`/meetings/${m.clientId}`}>Review pack for {clientName(m.clientId)}</Link>
                        <Link className="block text-xs text-accent underline" href={`/research/${m.clientId}`}>Briefing: what you do not yet know</Link>
                      </>
                    ) : m.prospectId ? (
                      <Link className="text-accent underline" href="/pipeline">Prospect notes</Link>
                    ) : m.kind === "internal" ? (
                      <Link className="text-accent underline" href="/onboarding">Escalated paperwork</Link>
                    ) : (
                      <Link className="text-accent underline" href="/servicing">Service queue</Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </Section>
      ))}
    </>
  );
}
