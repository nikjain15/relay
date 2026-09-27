import Link from "next/link";
import { ADVISORS_DATA } from "@/lib/data";
import { todaysMeetings, prospectFor, clientName } from "@/lib/meetings/prep";
import { APP } from "@/lib/data/policy";
import { AgentBar, PageTitle, Pill, Section, Who } from "@/components/ui";
import { CLIENTS } from "@/lib/data";

const KIND: Record<string, string> = { call: "Client call", review: "Client review", prospect: "Prospect", internal: "Internal", queue: "Callbacks" };

export default function Meetings() {
  return (
    <>
      <PageTitle title="Today's meetings" sub={`${APP.todayLabel}. Each client meeting has a review pack built from the client file.`} />
      {(() => {
        const all = ADVISORS_DATA.flatMap((a) => todaysMeetings(a.id));
        const withClient = all.filter((m) => m.clientId);
        return (
          <AgentBar
            name="Meeting prep"
            icon="calendar"
            read={`${all.length} meetings across ${ADVISORS_DATA.length} calendars and ${withClient.length} client files`}
            left={[`${withClient.length} review packs built`, `${withClient.length} briefings assembled`, `${all.filter((m) => m.prospectId).length} prospect notes`, `${all.filter((m) => m.kind === "internal" || m.kind === "queue").length} pointed at the queue it serves`]}
            steps={[
              { icon: "calendar", who: "advisor", title: "Read each calendar", detail: "Time, title, kind and purpose, from the advisor file." },
              { icon: "people", who: "client", title: "Read the client file behind each client meeting", detail: `${CLIENTS.length} files: goals with a gap, decisions with allowed and blocked counts, open items, documents.` },
              { icon: "briefing", who: "agent", title: "Built a review pack and a briefing per client meeting", detail: "What changed, observed apart from inferred, what could not be established." },
              { icon: "check", who: "advisor", title: "Left the conversation to the advisor", detail: "Nothing is drafted for the client here." },
            ]}
          />
        );
      })()}
      {ADVISORS_DATA.map((a) => (
        <Section key={a.id} title={a.walkthrough?.label ?? a.name}>
          <ol className="grid max-w-4xl gap-2">
            {todaysMeetings(a.id).map((m) => {
              const p = prospectFor(m);
              return (
                <li key={m.time} className="grid grid-cols-[4rem_1fr_auto] items-start gap-3 rounded border border-line p-3">
                  <span className="font-semibold">{m.time}</span>
                  <span>
                    {m.clientId ? <Who who="client" /> : <Who who="advisor" />}<span className="font-medium">{m.title}</span> <Pill>{KIND[m.kind]}</Pill>
                    <span className="block text-ink-2">{m.purpose}</span>
                    {p && <span className="block text-xs text-ink-2">Prospect: {p.label}. {p.signal}</span>}
                  </span>
                  <span>
                    {m.clientId ? (
                      <>
                        <Who who="agent" /><Link className="text-accent underline" href={`/meetings/${m.clientId}`}>Review pack for {clientName(m.clientId)}</Link>
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
