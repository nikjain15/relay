import Link from "next/link";
import { CLIENTS, SERVICE_REQUESTS } from "@/lib/data";
import { triage } from "@/lib/servicing/classify";
import { PageTitle, Pill, Section, td, th } from "@/components/ui";

export default function Servicing() {
  const list = triage(SERVICE_REQUESTS);
  return (
    <>
      <PageTitle
        title="Service requests"
        sub="Each request classified by rule and routed with a response-time target. Measured on time to resolution, never on volume. Replies are drafted; people send them."
      />
      <p className="mb-3">
        <Pill tone="fail">{list.filter((r) => r.callbackRequired).length} need a callback before release</Pill>{" "}
        <Pill tone="fail">{list.filter((r) => r.overdue).length} overdue</Pill>{" "}
        <Pill>{list.length} open</Pill>
      </p>
      <Section title="Queue, most urgent first">
        <table className="w-full max-w-6xl border-collapse">
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
                    <div className="text-[11px] text-neutral-500">{r.channel}</div>
                  </td>
                  <td className={`${td} max-w-sm`}>&ldquo;{r.text}&rdquo;</td>
                  <td className={td}>
                    <Pill tone={r.callbackRequired ? "fail" : "accent"}>{r.kind}</Pill>
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
                    {r.callbackRequired
                      ? "Call the client back on a number already on file to confirm before any money moves. An email instruction alone is never enough."
                      : "Reply drafted for the team to review and send."}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
    </>
  );
}
