"use client";

// Session state for the demo: dismissals, accepted proposals, the supervisory
// queue. Lives in React state and resets on reload (BUILD-SPEC §1).
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Regime } from "@/lib/recipients/count";

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
}

const Ctx = createContext<State | null>(null);

export function StateProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<Record<string, string>>({});
  const [queue, setQueue] = useState<QueueItem[]>([]);
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
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRelay(): State {
  const s = useContext(Ctx);
  if (!s) throw new Error("useRelay outside StateProvider");
  return s;
}
