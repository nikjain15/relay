"use client";

import Link from "next/link";
import { ADVISORS_DATA } from "@/lib/data";
import { KEYS, SCHEMA } from "@/lib/profile";
import { fmtChange } from "@/lib/profile/format";
import { LEARNING, suggest, type Suggestion } from "@/lib/learning/learn";
import { clientName } from "@/lib/meetings/prep";
import { useRelay } from "@/components/state";
import { PageTitle, Pill, Section, btn, btnPrimary } from "@/components/ui";

const WHERE: Record<string, [string, string]> = {
  "triage.classWeights": ["/triage", "Today's list"],
  "triage.dailyCap": ["/triage", "Today's list"],
  "proposals.sortBy": ["/triage", "Options, from Today's list"],
  "review.sectionOrder": ["/meetings", "Review packs"],
  "note.length": ["/communications", "Client notes"],
  "contact.channel": ["/clients", "Client pages"],
};

const LOOP = ["Capture what advisors and clients do", "Learn a pattern with enough evidence", "Propose one change, with the evidence", "The advisor accepts or declines", "Apply it as a new settings version", "Measure the outcome", "Keep it, or undo it"];

export default function Learning() {
  const { overlay, rejected, learned, acceptSuggestion, declineSuggestion, undoSuggestion } = useRelay();
  const all = suggest({ overlay, rejected }).filter((s) => !learned.some((l) => l.id === s.id));
  const open = all.filter((s) => !s.heldBack);
  const held = all.filter((s) => s.heldBack);
  const who = (s: Suggestion) => (s.scope === "client" ? clientName(s.scopeId) : ADVISORS_DATA.find((a) => a.id === s.scopeId)?.walkthrough?.label ?? s.scopeId);
  const card = (s: Suggestion, actions: React.ReactNode) => (
    <li key={s.id} className="rounded border border-line p-3">
      <p className="font-medium">
        {who(s)}: {SCHEMA[s.key].label.toLowerCase()}. {fmtChange(s.key, s.from, s.to, s.detail)[0]}
        {fmtChange(s.key, s.from, s.to, s.detail)[1]} &rarr; <strong>{fmtChange(s.key, s.from, s.to, s.detail)[2]}</strong>
      </p>
      <p className="text-ink-2">{s.because}</p>
      <p className="text-xs text-ink-2">
        Evidence: {s.evidence.events} events, {Math.round(s.evidence.share * 100)}% agree, last {s.evidence.windowDays} days. Checked after {LEARNING.checkAfterDays} days: {s.measure}
      </p>
      {s.heldBack && <p className="text-xs text-ink-2">{s.heldBack}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">{actions}</div>
    </li>
  );
  return (
    <>
      <PageTitle title="Suggestions" sub="What Relay learned from how advisors and clients work. It proposes; you decide. It never changes a rule, and never changes which options are allowed." />
      <ol className="mb-4 flex max-w-6xl flex-wrap gap-1 text-xs" aria-label="The learning loop">
        {LOOP.map((x, i) => (
          <li key={x} className="rounded border border-line px-2 py-0.5">{i + 1}. {x}</li>
        ))}
      </ol>
      <Section title={`Waiting for your decision (${open.length})`}>
        {open.length === 0 ? (
          <p className="text-ink-2">Nothing new. Relay suggests again when there is enough fresh evidence.</p>
        ) : (
          <ul className="grid max-w-4xl gap-2">
            {open.map((s) =>
              card(s, (
                <>
                  <button className={btnPrimary} onClick={() => acceptSuggestion(s)}>Accept</button>
                  <button className={btn} onClick={() => declineSuggestion(s)}>Not now</button>
                </>
              )),
            )}
          </ul>
        )}
      </Section>
      {learned.length > 0 && (
        <Section title={`Accepted this session (${learned.length})`}>
          <ul className="grid max-w-4xl gap-2">
            {learned.map((s) =>
              card(s, (
                <>
                  <Pill tone="pass">In effect</Pill>
                  {WHERE[s.key] && <Link className="text-xs text-accent underline" href={WHERE[s.key][0]}>See it in {WHERE[s.key][1]}</Link>}
                  <button className={btn} onClick={() => undoSuggestion(s)}>Undo</button>
                </>
              )),
            )}
          </ul>
        </Section>
      )}
      {held.length > 0 && (
        <Section title={`Held back (${held.length})`}>
          <ul className="grid max-w-4xl gap-2">{held.map((s) => card(s, null))}</ul>
        </Section>
      )}
      <Section title="Never learned">
        <p className="text-xs text-ink-2">
          Rules are set by the firm, a segment or a client, and the loop cannot propose them:{" "}
          {KEYS.filter((k) => SCHEMA[k].kind === "rule").map((k) => SCHEMA[k].label.toLowerCase()).join("; ")}. Nor can it touch client constraints, the approved shelf, compliance checks or the recipient counter.
        </p>
      </Section>
    </>
  );
}
