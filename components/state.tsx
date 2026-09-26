"use client";

// Session state for the demo: dismissals, accepted proposals, the supervisory
// queue. Lives in React state and resets on reload (BUILD-SPEC §1).
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Regime } from "@/lib/recipients/count";
import type { Overlay } from "@/lib/profile";
import { applied, type Rejection, type Suggestion } from "@/lib/learning/learn";
import { SEED_EDITS, type RuleEdit } from "@/lib/compliance/store";
import type { ConnectionState, ConnectionStatus } from "@/lib/connectors/types";
import { CONNECTORS_DATA } from "@/lib/data";

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
  /** Set when the client's rules require a call before any written note. */
  callFirst?: { required: boolean; confirmed: boolean };
  /** Settings version in force when the draft was composed. */
  settingsVersion?: string;
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
  /**
   * The compliance change log. A rule is never mutated: the console appends an
   * edit and every screen resolves its policy from this list, so a change made
   * on the rules page is in force on the next evaluation anywhere in the app.
   */
  ruleEdits: RuleEdit[];
  editRule: (e: Omit<RuleEdit, "id" | "at">) => void;
  revertEdit: (id: string) => void;
  /**
   * Per-advisor connection state. Connecting a channel here changes what the
   * compliance agents can evaluate on every other screen, which is the point of
   * keeping it in one place: a gap closes everywhere at once.
   */
  connections: ConnectionState[];
  setConnectorStatus: (advisorId: string, connectorId: string, status: ConnectionStatus) => void;
  /**
   * Dispositions on agent findings. The agents detect; a principal clears,
   * returns or blocks. Nothing an agent raises clears itself.
   */
  caseDispositions: Record<string, { disposition: Disposition; comment?: string; at: string }>;
  disposeCase: (caseId: string, d: Disposition, comment?: string) => void;
}

const Ctx = createContext<State | null>(null);

export function StateProvider({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<Record<string, string>>({});
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [learned, setLearned] = useState<Suggestion[]>([]);
  const [rejected, setRejected] = useState<Rejection[]>([]);
  const [ruleEdits, setRuleEdits] = useState<RuleEdit[]>(SEED_EDITS);
  const [connections, setConnections] = useState<ConnectionState[]>(CONNECTORS_DATA.connections);
  const [caseDispositions, setCaseDispositions] = useState<State["caseDispositions"]>({});
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
    ruleEdits,
    editRule: (e) =>
      setRuleEdits((l) => [...l, { ...e, id: `e-${String(l.length + 1).padStart(3, "0")}`, at: new Date().toISOString() }]),
    // Reverting appends nothing and removes the entry, which is honest only
    // because this is a prototype with session state. In production a revert is
    // itself an edit, so the log stays append-only.
    revertEdit: (id) => setRuleEdits((l) => l.filter((x) => x.id !== id)),
    connections,
    caseDispositions,
    disposeCase: (caseId, disposition, comment) =>
      setCaseDispositions((s) => ({ ...s, [caseId]: { disposition, comment, at: new Date().toISOString() } })),
    setConnectorStatus: (advisorId, connectorId, status) =>
      setConnections((c) => {
        const found = c.some((x) => x.advisorId === advisorId && x.connectorId === connectorId);
        if (!found) return [...c, { advisorId, connectorId, status }];
        return c.map((x) =>
          x.advisorId === advisorId && x.connectorId === connectorId
            ? { ...x, status, issue: status === "degraded" ? x.issue : undefined, lastIngestAt: status === "connected" ? (x.lastIngestAt ?? "just now") : x.lastIngestAt }
            : x,
        );
      }),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRelay(): State {
  const s = useContext(Ctx);
  if (!s) throw new Error("useRelay outside StateProvider");
  return s;
}
