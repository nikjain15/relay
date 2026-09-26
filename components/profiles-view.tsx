"use client";

import { useState } from "react";
import { ADVISORS_DATA, CLIENTS, clientFile } from "@/lib/data";
import { APP } from "@/lib/data/policy";
import { ADVISOR_PROFILES, FIRM, KEYS, SCHEMA, SEGMENTS, resolveProfile, sourceLabel, type Values } from "@/lib/profile";
import { fmtValue } from "@/lib/profile/format";
import { clientName } from "@/lib/meetings/prep";
import { useRelay } from "@/components/state";
import { PageTitle, Pill, Section, btn, btnPrimary, td, th } from "@/components/ui";

export function ProfilesView({ advisor, client }: { advisor?: string; client?: string }) {
  const { overlay } = useRelay();
  const [advisorId, setAdvisorId] = useState(clientFile(client ?? "")?.advisorId ?? advisor ?? APP.defaultAdvisorId);
  const mine = CLIENTS.filter((c) => c.advisorId === advisorId);
  const [clientId, setClientId] = useState(client && mine.some((c) => c.id === client) ? client : mine[0]?.id);
  const cid = mine.some((c) => c.id === clientId) ? clientId : mine[0]?.id;
  const ap = ADVISOR_PROFILES.find((a) => a.advisorId === advisorId)!;
  const seg = SEGMENTS.find((s) => s.id === ap.segmentId)!;
  const c = CLIENTS.find((x) => x.id === cid);
  const r = resolveProfile({ advisorId, clientId: cid }, overlay);
  const learnedA = overlay.advisor?.[advisorId] ?? {};
  const learnedC = (cid && overlay.client?.[cid]) || {};
  const cell = (key: (typeof KEYS)[number], values: Values, learned: Values, layer: string) => {
    if (!SCHEMA[key].layers.includes(layer as never)) return <span className="text-ink-3">n/a</span>;
    const v = learned[key] ?? values[key];
    return v === undefined ? <span className="text-ink-3">inherits</span> : <>{fmtValue(key, v)}{learned[key] !== undefined && <> <Pill tone="accent">learned</Pill></>}</>;
  };
  return (
    <>
      <PageTitle title="Settings" sub="Every setting, resolved through four layers. Preferences: the most specific layer wins. Rules: the strictest layer wins, and no layer can loosen the firm's." />
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Advisor">
        {ADVISORS_DATA.map((a) => (
          <button key={a.id} className={a.id === advisorId ? btnPrimary : btn} aria-pressed={a.id === advisorId} onClick={() => setAdvisorId(a.id)}>
            {a.walkthrough?.label ?? a.name}
          </button>
        ))}
        <label className="ml-2 text-xs">
          Client{" "}
          <select className="rounded border border-line" value={cid} onChange={(e) => setClientId(e.target.value)}>
            {mine.map((x) => (
              <option key={x.id} value={x.id}>{clientName(x.id)}</option>
            ))}
          </select>
        </label>
      </div>
      <Section title={`Effective settings for ${c ? clientName(c.id) : "this advisor"}`}>
        <table className="w-full max-w-6xl border-collapse">
          <thead>
            <tr>
              <th className={th}>Setting</th>
              <th className={th}>Kind</th>
              <th className={th}>Firm</th>
              <th className={th}>Segment: {seg.label}</th>
              <th className={th}>Advisor</th>
              <th className={th}>Client</th>
              <th className={th}>Effective, and from</th>
            </tr>
          </thead>
          <tbody>
            {KEYS.map((k) => (
              <tr key={k}>
                <td className={td}>{SCHEMA[k].label}</td>
                <td className={td}><Pill tone={SCHEMA[k].kind === "rule" ? "fail" : "neutral"}>{SCHEMA[k].kind}</Pill></td>
                <td className={td}>{cell(k, FIRM.values, {}, "firm")}</td>
                <td className={td}>{cell(k, seg.values, {}, "segment")}</td>
                <td className={td}>{cell(k, ap.values, learnedA, "advisor")}</td>
                <td className={td}>{cell(k, (c?.preferences?.values ?? {}) as Values, learnedC, "client")}</td>
                <td className={td}>
                  <strong>{fmtValue(k, r.values[k as keyof typeof r.values]) || "Not set"}</strong>
                  <div className="text-xs text-ink-2">{sourceLabel(r.provenance[k])}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.ignored.length > 0 && (
          <p className="mt-2 text-xs text-critical">Ignored: {r.ignored.join("; ")}.</p>
        )}
        <p className="mt-2 text-xs text-ink-2">Version recorded on every rationale record: <span className="font-mono">{r.version}</span></p>
      </Section>
      <Section title="Where each layer lives">
        <ul className="list-inside list-disc text-xs">
          <li>Firm: <code>data/profiles/firm.json</code>. The floor for every rule.</li>
          <li>Segment: <code>data/profiles/segments.json</code>. Private wealth, Wealth Advice Center.</li>
          <li>Advisor: <code>data/profiles/advisors/&lt;id&gt;.json</code>, plus suggestions the advisor accepted.</li>
          <li>Client: the <code>preferences</code> block in <code>data/clients/&lt;id&gt;.json</code>, plus accepted suggestions.</li>
          <li>Bounds and who may set what: <code>data/profiles/schema.json</code>, enforced by <code>npm run check</code>.</li>
        </ul>
      </Section>
    </>
  );
}
