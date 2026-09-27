"use client";

// Session state for the demo: dismissals, accepted proposals, the supervisory
// queue. Lives in React state and resets on reload (BUILD-SPEC §1).
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Regime } from "@/lib/recipients/count";
import type { Overlay } from "@/lib/profile";
import { applied, type Rejection, type Suggestion } from "@/lib/learning/learn";
import { SEED_EDITS, type RuleEdit } from "@/lib/compliance/store";
import type { ConnectionState, ConnectionStatus } from "@/lib/connectors/types";
import { CLIENTS, CONNECTORS_DATA } from "@/lib/data";
import type { ClientFile, Doc, Opportunity } from "@/lib/types";
import { CORPUS } from "@/lib/fixtures/corpus";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { toOpportunity, type Candidate } from "@/lib/discovery/discover";

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
  /**
   * What a principal did with each rule change the proposer drafted. Accepting
   * one appends an ordinary edit to the change log in the principal's name;
   * declining records the refusal so the agent stops asking this session.
   */
  proposalDecisions: Record<string, { decision: "accepted" | "declined"; reason: string; at: string }>;
  decideProposal: (proposalId: string, decision: "accepted" | "declined", reason: string) => void;
  /**
   * What a person did with each action an agent prepared. Accepting a task puts
   * it on the follow-up list for the session; accepting a note makes it a draft
   * the advisor sends. Nothing is sent or written by accepting.
   */
  actionDecisions: Record<string, { decision: "accepted" | "declined"; at: string }>;
  decideAction: (actionId: string, decision: "accepted" | "declined") => void;
  /**
   * The session dataset: records connected from files in this browser, held
   * in memory beside the shipped book and never sent anywhere. Every engine
   * reads the merged book through `book`.
   */
  dataset: { clients: ClientFile[]; documents: Doc[]; batches: ImportBatch[] };
  addBatch: (batch: ImportBatch, clients: ClientFile[], documents: Doc[]) => void;
  clearDataset: () => void;
  /** The merged book: shipped records plus the session dataset, with accepted discoveries on today's list. */
  book: { clients: ClientFile[]; documents: Doc[]; opportunities: Opportunity[] };
  /** What the advisor did with each discovery candidate. Accepting puts it on today's list for the session. */
  discoveryDecisions: Record<string, { decision: "accepted" | "declined"; at: string }>;
  decideDiscovery: (candidate: Candidate, decision: "accepted" | "declined") => void;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  kind: "clients" | "messages" | "document" | "records";
  rows: number;
  accepted: number;
  errors: string[];
  warnings: string[];
  at: string;
  /** How long parsing, mapping and validation took, in milliseconds, in this browser. */
  ms: number;
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
  const [proposalDecisions, setProposalDecisions] = useState<State["proposalDecisions"]>({});
  const [actionDecisions, setActionDecisions] = useState<State["actionDecisions"]>({});
  const [dataset, setDataset] = useState<State["dataset"]>({ clients: [], documents: [], batches: [] });
  const [discoveryDecisions, setDiscoveryDecisions] = useState<State["discoveryDecisions"]>({});
  const [acceptedDiscoveries, setAcceptedDiscoveries] = useState<Opportunity[]>([]);
  const book = {
    // A connected record with a shipped id (a message file naming a shipped household) replaces the shipped one for the session.
    clients: [...CLIENTS.filter((c) => !dataset.clients.some((d) => d.id === c.id)), ...dataset.clients],
    documents: [...CORPUS, ...dataset.documents],
    opportunities: [...OPPORTUNITIES, ...dataset.clients.flatMap((c) => c.opportunities), ...acceptedDiscoveries],
  };
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
    dataset,
    addBatch: (batch, clients, documents) =>
      setDataset((d) => ({
        // A re-imported id replaces the earlier record rather than duplicating it.
        clients: [...d.clients.filter((c) => !clients.some((n) => n.id === c.id)), ...clients],
        documents: [...d.documents.filter((x) => !documents.some((n) => n.id === x.id)), ...documents],
        batches: [...d.batches, batch],
      })),
    clearDataset: () => setDataset({ clients: [], documents: [], batches: [] }),
    book,
    discoveryDecisions,
    decideDiscovery: (k, decision) => {
      setDiscoveryDecisions((s) => ({ ...s, [k.id]: { decision, at: new Date().toISOString() } }));
      if (decision === "accepted") setAcceptedDiscoveries((l) => [...l.filter((o) => o.id !== `opp-${k.id.replace(/^disc-/, "")}`), toOpportunity(k)]);
    },
    actionDecisions,
    decideAction: (id, decision) => setActionDecisions((s) => ({ ...s, [id]: { decision, at: new Date().toISOString() } })),
    proposalDecisions,
    decideProposal: (id, decision, reason) => setProposalDecisions((s) => ({ ...s, [id]: { decision, reason, at: new Date().toISOString() } })),
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
