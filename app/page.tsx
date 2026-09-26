import Link from "next/link";
import { CLIENTS, PROSPECTS, SERVICE_REQUESTS } from "@/lib/data";
import { rank, DEFAULT_CAP } from "@/lib/ranking/rank";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { openItems, ESCALATE_AFTER_DAYS } from "@/lib/onboarding/status";
import { triage } from "@/lib/servicing/classify";
import { PageTitle } from "@/components/ui";
import { todaysMeetings } from "@/lib/meetings/prep";
import { allTasks } from "@/lib/followups";
import { suggest } from "@/lib/learning/learn";
import { APP } from "@/lib/data/policy";

const F = APP.featured;

export default function Journey() {
  const open = CLIENTS.flatMap(openItems);
  const escalated = open.filter((w) => w.status === "escalated").length;
  const service = triage(SERVICE_REQUESTS);
  const phases = [
    {
      phase: "Before the relationship",
      stages: [
        { href: "/clients", title: "My clients", count: `${CLIENTS.length} clients`, what: "The whole book: cash cushion, flagged items, forms, requests, last contact and today's meetings." },
        { href: "/pipeline", title: "Finding new clients", count: `${PROSPECTS.length} prospects`, what: "Ranked by how warm the path in is. Relay drafts the introduction ask; the advisor sends it." },
        { href: "/onboarding", title: "Paperwork", count: `${open.length} open, ${escalated} escalated`, what: `Every open form per client. Unsigned after ${ESCALATE_AFTER_DAYS} days escalates (shorter for some segments and clients). Reminders drafted.` },
      ],
    },
    {
      phase: "The daily work",
      stages: [
        { href: "/triage", title: "Today's list", count: `${rank(OPPORTUNITIES).length} flagged`, what: `Overnight alerts ranked and capped at ${DEFAULT_CAP} a day by default; each advisor can set their own.` },
        { href: `/evidence/${F.opportunityId}`, title: "Why this client", count: "sources cited", what: "The reason, its sources and the client's recent history. Refuses when there is no source." },
        { href: `/household/${F.clientId}`, title: "Client picture", count: `${CLIENTS.length} clients`, what: "Goals, accounts, the family's rules, history, notes, tasks, paperwork and requests." },
        { href: `/household/${F.clientId}/proposal?opp=${F.opportunityId}`, title: "Options", count: "approved products only", what: "What fits the family's rules, and why each other option is blocked." },
        { href: "/communications", title: "Note and audience", count: "counts people", what: "A drafted note and talking points; shows the approval rule before anything moves." },
        { href: "/supervision", title: "Compliance check", count: "five checks", what: "A manager reviews what the advisor saw. Relay never sends." },
      ],
    },
    {
      phase: "Meetings",
      stages: [
        { href: "/meetings", title: "Today's meetings", count: `${todaysMeetings().length} across both advisors`, what: "Each client meeting has a review pack: what changed, gaps, decisions, open items, talking points." },
      ],
    },
    {
      phase: "After the advice",
      stages: [
        { href: "/follow-ups", title: "Follow-ups", count: `${allTasks().filter((x) => x.dueDay < 0).length} overdue tasks`, what: "Approved notes the advisor still has to send, calls to log, and tasks by owner and due date." },
        { href: "/servicing", title: "Service requests", count: `${service.length} open, ${service.filter((r) => r.overdue).length} overdue`, what: "Classified and routed. Money movement needs a callback to a number on file." },
        { href: "/measurement", title: "Measurement", count: "conversion, not volume", what: "How many flagged opportunities become approved client actions." },
      ],
    },
    {
      phase: "Personalized, and learning",
      stages: [
        { href: "/profiles", title: "Settings", count: "4 layers: firm, segment, advisor, client", what: "Every setting with where it came from. Preferences: most specific wins. Rules: strictest wins." },
        { href: "/learning", title: "Suggestions", count: `${suggest().filter((s) => !s.heldBack).length} waiting`, what: "Patterns learned from advisor and client behavior, proposed with evidence. The advisor accepts; rules are never learned." },
      ],
    },
  ];
  return (
    <>
      <PageTitle title="Advisor journey" sub="Every Relay surface in the order an advisor meets it. All clients and advisors are cited composites; see Who's who." />
      <div className="grid gap-10">
        {phases.map((p) => (
          <section key={p.phase}>
            <h2 className="mb-3 text-[15px] font-semibold">{p.phase}</h2>
            <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {p.stages.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="block h-full rounded border border-line bg-surface p-5 transition-colors hover:border-ink">
                    <span className="block text-base font-semibold">{s.title}</span>
                    <span className="mt-1 block text-xs text-ink-3">{s.count}</span>
                    <span className="mt-3 block text-ink-2">{s.what}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
