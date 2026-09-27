"use client";

// The signed-in advisor's calendar, from the same view the Overview counts.
import Link from "next/link";
import { prospectFor } from "@/lib/meetings/prep";
import { APP } from "@/lib/data/policy";
import { AgentBar, PageTitle, Pill, Section, Who } from "@/components/ui";
import { useView } from "@/components/view";

const KIND: Record<string, string> = { call: "Client call", review: "Client review", prospect: "Prospect", internal: "Internal", queue: "Callbacks" };

export default function Meetings() {
  const v = useView();
  const a = v.advisor;
  const name = (id: string) => { const c = v.clientOf(id); return c ? (c.persons.length > 1 ? `${c.name} family` : c.persons[0]?.name ?? c.name) : id; };
  return (
    <>
      <PageTitle icon="calendar" title="Meetings" sub={`${APP.todayLabel}. Each client meeting has a review pack built from the client file.`} />
      {(() => {
        const all = v.meetings;
        const withClient = all.filter((m) => m.clientId);
        return (
          <AgentBar
            name="Meeting prep"
            icon="calendar"
            read={`${all.length} meetings on ${a.name}'s calendar and ${withClient.length} client file${withClient.length === 1 ? "" : "s"}`}
            left={[`${withClient.length} review packs built`, `${withClient.length} briefings assembled`, `${all.filter((m) => m.prospectId).length} prospect notes`, `${all.filter((m) => m.kind === "internal" || m.kind === "queue").length} pointed at the queue it serves`]}
            steps={[
              { icon: "calendar", who: "advisor", title: "Read each calendar", detail: "Time, title, kind and purpose, from the advisor file." },
              { icon: "people", who: "client", title: "Read the client file behind each client meeting", detail: `${withClient.length} file${withClient.length === 1 ? "" : "s"}: goals with a gap, decisions with allowed and blocked counts, open items, documents.` },
              { icon: "briefing", who: "agent", title: "Built a review pack and a briefing per client meeting", detail: "What changed, observed apart from inferred, what could not be established." },
              { icon: "check", who: "advisor", title: "Left the conversation to the advisor", detail: "Nothing is drafted for the client here." },
            ]}
          />
        );
      })()}
      {[a].map((a) => (
        <Section key={a.id} title={a.walkthrough?.label ?? a.name}>
          <ol className="grid max-w-4xl gap-2">
            {v.meetings.map((m) => {
              const p = prospectFor(m);
              return (
                <li key={m.time} className="grid grid-cols-[4rem_1fr_auto] items-start gap-3 rounded border border-line p-3">
                  <span className="font-semibold">{m.time}</span>
                  <span>
                    {m.clientId ? <Who who="client" /> : <Who who="advisor" />}<span className="font-medium">{m.title}</span> <Pill>{KIND[m.kind]}</Pill>
                    <span className="block text-ink-2">{m.purpose}</span>
                    {p && <span className="block text-meta leading-4 text-ink-2">Prospect: {p.label}. {p.signal}</span>}
                  </span>
                  <span>
                    {m.clientId ? (
                      <>
                        <Who who="agent" /><Link className="text-accent underline" href={`/meetings/${m.clientId}`}>Review pack for {name(m.clientId)}</Link>
                        <Link className="block text-meta leading-4 text-accent underline" href={`/research/${m.clientId}`}>Briefing: what you do not yet know</Link>
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
