"use client";

// Session state for the demo: dismissals, accepted proposals, the supervisory
// queue. Lives in React state and resets on reload (BUILD-SPEC §1).
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Regime } from "@/lib/recipients/count";
import type { Overlay } from "@/lib/profile";
import { applied, type Rejection, type Suggestion } from "@/lib/learning/learn";

export type Disposition = "approved" | "returned" | "blocked";

export interface QueueItem {
  id: string;
  opportunityId: string;
  householdId: string;
  candidateId: string;
  draft: string;
  sources: string[];
  citedTitles: string[];
  recipients: number;
  regime: Regime;
  batchSize: number;
  disposition?: Disposition;
  comment?: string;
  /** Set when the advisor confirms they sent the approved note themselves. */
  sentByAdvisor?: boolean;
}

export interface LogEntry {
  clientId: string;
  what: string;
}

interface State {
  dismissed: Record<string, string>;
  dismiss: (oppId: string, reason: string) => void;
  restore: (oppId: string) => void;
  accepted: Record<string, string>;
  accept: (oppId: string, candidateId: string) => void;
  queue: QueueItem[];
  submit: (item: Omit<QueueItem, "id">) => void;
  dispose: (id: string, d: Disposition, comment?: string) => void;
  markSent: (id: string) => void;
  log: LogEntry[];
  addLog: (e: LogEntry) => void;
  /** Settings the advisor accepted from the learning loop. In production this is a versioned write to the settings service. */
  overlay: Overlay;
  learned: Suggestion[];
  rejected: Rejection[];
  acceptSuggestion: (s: Suggestion) => void;
  declineSuggestion: (s: Suggestion) => void;
  undoSuggestion: (s: Suggestion) => void;
}

const Ctx = createContext<State | null>(null);

export function StateProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<Record<string, string>>({});
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [learned, setLearned] = useState<Suggestion[]>([]);
  const [rejected, setRejected] = useState<Rejection[]>([]);
  const overlay: Overlay = {};
  for (const s of learned) {
    const side = (overlay[s.scope] ??= {});
    const vals = (side[s.scopeId] ??= {});
    vals[s.key] = applied(s, vals[s.key]);
  }
  const value: State = {
    dismissed,
    dismiss: (id, reason) => setDismissed((s) => ({ ...s, [id]: reason })),
    restore: (id) =>
      setDismissed((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      }),
    accepted,
    accept: (oppId, candidateId) => setAccepted((s) => ({ ...s, [oppId]: candidateId })),
    queue,
    submit: (item) => setQueue((q) => [...q, { ...item, id: `q-${q.length + 1}` }]),
    dispose: (id, d, comment) => setQueue((q) => q.map((x) => (x.id === id ? { ...x, disposition: d, comment } : x))),
    markSent: (id) => setQueue((q) => q.map((x) => (x.id === id ? { ...x, sentByAdvisor: true } : x))),
    log,
    addLog: (e) => setLog((l) => [...l, e]),
    overlay,
    learned,
    rejected,
    acceptSuggestion: (s) => setLearned((l) => [...l.filter((x) => x.id !== s.id), s]),
    declineSuggestion: (s) => setRejected((r) => [...r, { scopeId: s.scopeId, key: s.key, detail: s.detail, day: 0 }]),
    undoSuggestion: (s) => setLearned((l) => l.filter((x) => x.id !== s.id)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRelay(): State {
  const s = useContext(Ctx);
  if (!s) throw new Error("useRelay outside StateProvider");
  return s;
}
