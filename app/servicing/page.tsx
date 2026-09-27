import Link from "next/link";
import { CLIENTS, SERVICE_REQUESTS } from "@/lib/data";
import { triage } from "@/lib/servicing/classify";
import { AgentBar, PageTitle, Pill, Section, TableScroll, Who, td, th } from "@/components/ui";
import { POLICY } from "@/lib/data/policy";
import { Icon } from "@/components/icons";

export default function Servicing() {
  const list = triage(SERVICE_REQUESTS);
  return (
    <>
      <PageTitle
        icon="clock"
        title="Service requests"
        sub="Each request classified by rule and routed with a response-time target. Measured on time to resolution, never on volume. Replies are drafted; people send them."
      />
      <AgentBar
        name="Service"
        icon="clock"
        read={`${list.length} open requests on ${new Set(list.map((r) => r.channel)).size} channels`}
        left={[`${list.filter((r) => r.callbackRequired).length} need a callback before any money moves`, `${list.filter((r) => r.overdue).length} past target`, `${list.filter((r) => !r.callbackRequired).length} replies drafted for the team`]}
        steps={[
          { icon: "email", who: "client", title: "Read each request as the client wrote it", detail: "The text, the channel and when it arrived." },
          { icon: "rules", who: "agent", title: `Classified it against ${POLICY.servicing.rules.length} routing rules`, detail: "First matching rule wins; money movement is first and always requires a callback to a number on file." },
          { icon: "clock", who: "agent", title: "Routed it with a response target", detail: "Hours left are counted from arrival, so the queue is ordered by what runs out first." },
          { icon: "document", who: "agent", title: "Drafted the reply where no callback is required", detail: "From the request and the client file; never from a model at runtime." },
          { icon: "people", who: "advisor", title: "Left the send, and every callback, to a person", detail: "Nothing here moves money or leaves the building." },
        ]}
        note="In production a model reads the request's free text more capably; the routing rule and the callback requirement stay deterministic."
      />
      <p className="mb-3">
        <Pill tone="fail">{list.filter((r) => r.callbackRequired).length} need a callback before release</Pill>{" "}
        <Pill tone="fail">{list.filter((r) => r.overdue).length} overdue</Pill>{" "}
        <Pill>{list.length} open</Pill>
      </p>
      <Section title="Queue, most urgent first">
        <TableScroll>
          <table className="w-full min-w-[34rem] max-w-6xl border-collapse">
            <thead>
              <tr>
                <th className={th}>Client</th>
                <th className={th}>Request</th>
                <th className={th}>Type</th>
                <th className={th}>Goes to</th>
                <th className={th}>Time</th>
                <th className={th}>Control</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const c = CLIENTS.find((x) => x.id === r.clientId)!;
                return (
                  <tr key={r.id}>
                    <td className={td}>
                      <Link className="underline" href={`/household/${c.id}`}>
                        {c.name}
                      </Link>
                      <div className="text-xs text-ink-2">{r.channel}</div>
                    </td>
                    <td className={`${td} max-w-sm`}><Who who="client" />&ldquo;{r.text}&rdquo;</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-1.5"><Icon name={r.callbackRequired ? "voice" : "clock"} size={16} className={r.callbackRequired ? "text-critical" : "text-ink-3"} /><Pill tone={r.callbackRequired ? "fail" : "accent"}>{r.kind}</Pill></span>
                    </td>
                    <td className={td}>{r.route}</td>
                    <td className={td}>
                      {r.overdue ? (
                        <Pill tone="fail">{`overdue by ${-r.hoursLeft}h`}</Pill>
                      ) : (
                        <span>{`${r.hoursLeft}h left of ${r.targetHours}h`}</span>
                      )}
                    </td>
                    <td className={`${td} max-w-xs text-xs`}>
                      <Who who="advisor" />
                      {r.callbackRequired
                        ? "Call the client back on a number already on file to confirm before any money moves. An email instruction alone is never enough."
                        : "Reply drafted for the team to review and send."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      </Section>
    </>
  );
}
