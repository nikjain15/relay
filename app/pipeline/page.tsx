import { ADVISORS_DATA, PROSPECTS } from "@/lib/data";
import { rankProspects, prospectScore, introDraft, PATH_LABEL } from "@/lib/prospecting/rank";
import { usd } from "@/lib/format";
import { AgentBar, PageTitle, Pill, Section, TableScroll, Who, td, th } from "@/components/ui";

export default function Pipeline() {
  return (
    <>
      <PageTitle
        title="Finding new clients"
        sub="Prospects ranked by how warm the path in is, how well they fit the practice, and size. Relay drafts the ask; the advisor sends it."
      />
      <AgentBar
        name="Prospecting"
        icon="plus"
        read={`${PROSPECTS.length} prospects across ${ADVISORS_DATA.filter((a) => rankProspects(PROSPECTS, a.id).length).length} books, each with its signal and the path in`}
        left={[`${PROSPECTS.length} ranked by path, fit and size`, `${PROSPECTS.filter((p) => p.path !== "signal").length} warm paths found`, `${PROSPECTS.length} introduction asks drafted`, `${PROSPECTS.filter((p) => p.path === "signal").length} left cold, with no draft`]}
        steps={[
          { icon: "search", who: "agent", title: "Read each prospect's signal and provenance", detail: "Every prospect names the public source its situation is built from." },
          { icon: "social", who: "agent", title: "Scored the path in", detail: "An existing client or a referral 3, an event 2, a signal alone 1." },
          { icon: "filter", who: "agent", title: "Added fit to the practice and size", detail: "0 to 2 each, from the advisor's stated practice and the estimate." },
          { icon: "email", who: "agent", title: "Drafted the ask where a warm path exists", detail: "Through the person who knows them; a cold prospect gets no draft." },
          { icon: "people", who: "advisor", title: "Left the sending to the advisor", detail: "Relay never contacts a prospect." },
        ]}
        note="In production a model would tailor the ask's wording to the referrer; the ranking stays arithmetic."
      />
      {ADVISORS_DATA.map((a) => {
        const list = rankProspects(PROSPECTS, a.id);
        if (!list.length) return null;
        return (
          <Section key={a.id} title={`${a.name}: ${a.role}`}>
            <TableScroll>
              <table className="w-full min-w-[34rem] max-w-6xl border-collapse">
                <thead>
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>Prospect</th>
                    <th className={th}>Signal</th>
                    <th className={th}>Path in</th>
                    <th className={`${th} text-right`}>Est. assets</th>
                    <th className={th}>Next step (draft)</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p, i) => (
                    <tr key={p.id}>
                      <td className={td}>
                        {i + 1}
                        <div className="text-xs text-ink-2">score {prospectScore(p)}</div>
                      </td>
                      <td className={td}>
                        <div className="font-medium">{p.label}</div>
                        <div className="text-xs text-ink-2">
                          {p.lastTouchDays === null ? "No contact yet" : `Last touch ${p.lastTouchDays} days ago`}
                        </div>
                      </td>
                      <td className={td}><Who who="client" label="Prospect" />{p.signal}</td>
                      <td className={td}>
                        <Pill tone={p.path === "signal" ? "neutral" : "accent"}>{PATH_LABEL[p.path]}</Pill>
                        <div className="mt-0.5 text-xs text-ink-2">{p.pathDetail}</div>
                      </td>
                      <td className={`${td} text-right`}>{usd(p.estimatedUsd)}</td>
                      <td className={`${td} max-w-sm text-xs`}>
                        <Who who={p.path === "signal" ? "advisor" : "agent"} />{introDraft(p)}
                        <div className="mt-1 text-xs text-ink-2">
                          Built from:{" "}
                          {p.groundedIn.map((s, k) => (
                            <span key={s.url}>
                              {k > 0 && "; "}
                              <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                                {s.label}
                              </a>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Section>
        );
      })}
      <p className="text-xs text-ink-2">Score: path in (existing or referral 3, event 2, signal only 1) + fit to the practice (0 to 2) + size (0 to 2).</p>
    </>
  );
}
