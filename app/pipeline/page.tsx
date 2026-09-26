import { ADVISORS_DATA, PROSPECTS } from "@/lib/data";
import { rankProspects, prospectScore, introDraft, PATH_LABEL } from "@/lib/prospecting/rank";
import { usd } from "@/lib/format";
import { PageTitle, Pill, Section, TableScroll, td, th } from "@/components/ui";

export default function Pipeline() {
  return (
    <>
      <PageTitle
        title="Finding new clients"
        sub="Prospects ranked by how warm the path in is, how well they fit the practice, and size. Relay drafts the ask; the advisor sends it."
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
                      <td className={td}>{p.signal}</td>
                      <td className={td}>
                        <Pill tone={p.path === "signal" ? "neutral" : "accent"}>{PATH_LABEL[p.path]}</Pill>
                        <div className="mt-0.5 text-xs text-ink-2">{p.pathDetail}</div>
                      </td>
                      <td className={`${td} text-right`}>{usd(p.estimatedUsd)}</td>
                      <td className={`${td} max-w-sm text-xs`}>
                        {introDraft(p)}
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
