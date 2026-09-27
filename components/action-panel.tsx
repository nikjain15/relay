"use client";

// The action panel: one prepared action, opened beside the list it came from.
//
// Accepting used to make a row vanish. That read as nothing happening, because
// nothing visible did. Now a row opens here: the whole draft or task, who acts
// on it, where it goes, the agent's reasoning, and a decision that stays on
// screen once made: "Recorded, nothing sent", with the link to where it went.
// Declining asks for one line, which the learning loop reads.
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRelay } from "@/components/state";
import { Icon, type IconName } from "@/components/icons";
import { Pill, Trace, Who, btn, btnPrimary, textarea, type Perspective } from "@/components/ui";
import { KIND, type PreparedAction } from "@/lib/compliance/actions";

export const ACTION_ICON: Record<string, IconName> = { draft_note: "email", task: "check", schedule: "calendar", callback: "voice", request_form: "esign", connect_source: "link", hold: "block" };

export interface TraceStep { icon: IconName; title: string; detail?: ReactNode; tone?: "plain" | "critical" | "caution" | "positive"; who?: Perspective }

/** Where an accepted action goes, in the words of the screen it lands on. */
const NEXT: Record<PreparedAction["kind"], { label: string; href: string; who: string }> = {
  draft_note: { label: "Copy the draft and send it from your own mail. It is on the supervision queue until you say you did.", href: "/supervision", who: "You send it" },
  task: { label: "On your follow-up list for the session.", href: "/follow-ups", who: "The owner does it" },
  schedule: { label: "Relay proposes the slot; you book it.", href: "/meetings", who: "You book it" },
  callback: { label: "On the service queue, to the number on file.", href: "/servicing", who: "You call" },
  request_form: { label: "On the paperwork list for the client service associate.", href: "/onboarding", who: "The associate requests it" },
  connect_source: { label: "Connect it on the Sources page.", href: "/sources", who: "Compliance connects it" },
  hold: { label: "Held on the supervision queue until a principal dispositions the finding.", href: "/supervision", who: "A principal releases it" },
};

export function ActionPanel({ action, trace, onClose }: { action: PreparedAction | null; trace: (a: PreparedAction) => TraceStep[]; onClose: () => void }) {
  const { actionDecisions, decideAction } = useRelay();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!action) return;
    setDeclining(false); setReason(""); setCopied(false);
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [action, onClose]);

  if (!action) return null;
  const decided = actionDecisions[action.id];
  const kind = KIND[action.kind];
  const next = NEXT[action.kind];
  const copy = async () => {
    try { await navigator.clipboard.writeText(action.detail); setCopied(true); } catch { setCopied(false); }
  };

  return (
    <div className="fixed inset-0 z-30" role="presentation">
      <button type="button" aria-label="Close the action" onClick={onClose} className="absolute inset-0 bg-ink/20" />
      <aside ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={action.title} className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-y-auto border-l border-line bg-surface shadow-lg focus:outline-none">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <Icon name={ACTION_ICON[action.kind] ?? "check"} size={20} className="mt-0.5 text-agent" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-ink-3"><Who who="agent" />{action.agentName} prepared a {kind.label.toLowerCase()}</p>
            <h2 className="mt-1 text-[16px] font-semibold leading-snug text-ink">{action.title}</h2>
            <p className="mt-1 text-[12px] text-ink-3">{action.subjectLabel === action.agentName ? "Firm-wide" : action.subjectLabel} · {kind.actor} acts once accepted</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line text-ink" aria-label="Close"><Icon name="close" size={16} /></button>
        </header>

        <div className="flex-1 px-5 py-4">
          <p className="mb-1.5 text-[12px] text-ink-3">{action.kind === "draft_note" ? `The draft, to the ${action.to}` : action.kind === "task" ? "The task" : action.kind === "hold" ? "What is held" : "What is prepared"}</p>
          <div className="whitespace-pre-wrap rounded border border-line bg-subtle px-3 py-2.5 text-[13px] leading-relaxed text-ink">{action.detail}</div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
            {action.kind === "draft_note" && <><dt className="text-ink-3">Audience</dt><dd className="text-ink-2">1 recipient, correspondence. The counter sets the regime before anything moves.</dd></>}
            {action.dueInDays !== undefined && <><dt className="text-ink-3">Due</dt><dd className="text-ink-2">In {action.dueInDays} day{action.dueInDays === 1 ? "" : "s"}</dd></>}
            {action.form && <><dt className="text-ink-3">Form</dt><dd className="text-ink-2">{action.form}</dd></>}
            <dt className="text-ink-3">Then</dt><dd className="text-ink-2"><Who who="advisor" label={next.who} />{next.label}</dd>
          </dl>
          <Trace steps={trace(action)} />
        </div>

        <footer className="border-t border-line px-5 py-4">
          {decided ? (
            <div className={`rounded border px-3 py-2.5 text-[13px] ${decided.decision === "accepted" ? "border-positive/40 bg-positive-soft" : "border-line bg-subtle"}`}>
              <p className="flex items-center gap-1.5 text-ink"><Icon name={decided.decision === "accepted" ? "check" : "block"} size={16} className={decided.decision === "accepted" ? "text-positive" : "text-ink-3"} />
                {decided.decision === "accepted" ? "Recorded. Nothing was sent." : "Declined. Nothing was sent."}
              </p>
              <p className="mt-1 text-[12px] text-ink-2">
                {decided.decision === "accepted" ? <>{next.label} <Link href={next.href} className="underline">Open</Link>.</> : <>Reason recorded: &ldquo;{decided.reason}&rdquo;. The <Link href="/learning" className="underline">learning loop</Link> reads it and proposes; it never applies.</>}
              </p>
              {decided.decision === "accepted" && action.kind === "draft_note" && (
                <p className="mt-2"><button type="button" className={btn} onClick={copy}>{copied ? "Copied" : "Copy the draft"}</button></p>
              )}
            </div>
          ) : declining ? (
            <div>
              <label className="block text-[12px] text-ink-3" htmlFor="decline-reason">Why not. One line a supervisor can read later.</label>
              <textarea id="decline-reason" className={`${textarea} mt-1`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Already handled on the call this morning" />
              <p className="mt-2 flex gap-2">
                <button type="button" className={btnPrimary} disabled={reason.trim().length < 8} onClick={() => decideAction(action.id, "declined", reason.trim())}>Record the decline</button>
                <button type="button" className={btn} onClick={() => setDeclining(false)}>Back</button>
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnPrimary} onClick={() => decideAction(action.id, "accepted")}>Accept</button>
              <button type="button" className={btn} onClick={() => setDeclining(true)}>Decline with a reason</button>
              <span className="text-[12px] text-ink-3"><Pill tone="neutral">Nothing sends</Pill> Accepting records it; you act.</span>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}
