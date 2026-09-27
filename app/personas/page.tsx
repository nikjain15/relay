import Link from "next/link";
import { ADVISORS } from "@/lib/fixtures/advisors";
import { HOUSEHOLDS } from "@/lib/fixtures/households";
import { usd } from "@/lib/format";
import { PageTitle, Pill, Section, TableScroll, td, th } from "@/components/ui";

export const metadata = { title: "Who's who" };

export default function Personas() {
  return (
    <>
      <PageTitle
        icon="crm"
        title="Who's who"
        sub="Cited composites: invented names and exact figures, set inside ranges and situations UBS and public sources describe. No real client or advisor. Full detail in docs/PERSONAS.md."
      />
      <Section title="Advisors">
        <div className="grid max-w-5xl gap-4 md:grid-cols-2">
          {ADVISORS.map((a) => (
            <div key={a.id} className="rounded border border-line p-3">
              <p className="font-semibold">{a.name}</p>
              <p className="text-ink-2">{a.role}</p>
              <p className="mt-1">{a.book}</p>
              <ul className="mt-2 space-y-0.5">
                {a.facts.map((f) => (
                  <li key={f.detail}>
                    <Pill tone={f.kind === "Chosen" ? "neutral" : "accent"}>{f.kind}</Pill> {f.detail}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-meta leading-4 font-semibold text-ink-2">Built from</p>
              <ul className="text-meta leading-4">
                {a.groundedIn.map((s) => (
                  <li key={s.url}>
                    <a className="text-accent underline" href={s.url} target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Households">
        <TableScroll>
          <table className="w-full min-w-[34rem] max-w-5xl border-collapse">
            <thead>
              <tr>
                <th className={th}>Household</th>
                <th className={th}>Tier</th>
                <th className={`${th} text-right`}>Assets</th>
                <th className={th}>Situation</th>
                <th className={th}>Built from</th>
              </tr>
            </thead>
            <tbody>
              {HOUSEHOLDS.map((h) => (
                <tr key={h.id}>
                  <td className={td}>
                    <Link className="underline" href={`/household/${h.id}`}>
                      {h.name}
                    </Link>
                    <div className="text-meta leading-4 text-ink-2">{h.archetype}, {h.persons.length} {h.persons.length === 1 ? "person" : "people"}</div>
                  </td>
                  <td className={td}>{h.tier}</td>
                  <td className={`${td} text-right`}>{usd(h.totalUsd)}</td>
                  <td className={td}>{h.hardPart}</td>
                  <td className={`${td} text-meta leading-4`}>
                    {h.groundedIn.map((s) => (
                      <div key={s.url}>
                        <a className="text-accent underline" href={s.url} target="_blank" rel="noreferrer">
                          {s.label}
                        </a>
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Section>
    </>
  );
}
