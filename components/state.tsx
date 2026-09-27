"use client";

// Session state for the demo: dismissals, accepted proposals, the supervisory
// queue. Lives in React state and resets on reload (BUILD-SPEC §1).
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Regime } from "@/lib/recipients/count";
import type { Overlay, SettingKey, Values } from "@/lib/profile";
import type { CustomAgent } from "@/lib/agents/templates";
import type { Cadence } from "@/lib/compliance/agents";
import { APP } from "@/lib/data/policy";
import { applied, type Rejection, type Suggestion } from "@/lib/learning/learn";
import { SEED_EDITS, type RuleEdit } from "@/lib/compliance/store";
import type { RuleDefinition } from "@/lib/compliance/types";
import type { ConnectionState, ConnectionStatus } from "@/lib/connectors/types";
import { CLIENTS, CONNECTORS_DATA } from "@/lib/data";
import type { ClientFile, Doc, Opportunity, TeamNote } from "@/lib/types";
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
  /** Agents advisors made from a template this session. Each runs one rule of its own in the same sweep as the desks. */
  customAgents: CustomAgent[];
  createAgent: (a: CustomAgent, actor: string) => void;
  updateAgent: (id: string, patch: { name?: string; mission?: string; cadence?: Cadence; value?: number | string; enabled?: boolean }, actor: string) => void;
  deleteAgent: (id: string, actor: string) => void;
  /** Changes to a desk that would loosen supervision wait here for a principal. */
  agentRequests: AgentRequest[];
  requestAgentChange: (r: Omit<AgentRequest, "id" | "at" | "status">) => void;
  decideAgentRequest: (id: string, approve: boolean, by: string, comment?: string) => void;
  /** Non-desk agents an advisor turned off for themselves, by advisor id. */
  rosterOff: Record<string, string[]>;
  setRosterOn: (advisorId: string, agentId: string, on: boolean) => void;
  /** The advisor this session is signed in as. Every screen that says "you" reads it. */
  advisorId: string;
  setAdvisorId: (id: string) => void;
  /** Settings an advisor tuned on screen this session (the ranking desk), by advisor id. */
  tuned: Record<string, Values>;
  tune: (advisorId: string, key: SettingKey, value: unknown) => void;
  resetTuning: (advisorId: string) => void;
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
  actionDecisions: Record<string, { decision: "accepted" | "declined"; at: string; reason?: string }>;
  decideAction: (actionId: string, decision: "accepted" | "declined", reason?: string) => void;
  /**
   * Rules read from a policy document and added to a desk this session. Each
   * is a RuleDefinition like any in the baseline, and the desk edit that gives
   * it to an agent is an ordinary entry in the change log. In production this
   * is a write to the rule catalog with the same attribution.
   */
  addedRules: RuleDefinition[];
  addRule: (rule: RuleDefinition, agentId: string, actor: string, reason: string) => void;
  /**
   * The session dataset: records connected from files in this browser, held
   * in memory beside the shipped book and never sent anywhere. Every engine
   * reads the merged book through `book`.
   */
  dataset: { clients: ClientFile[]; documents: Doc[]; batches: ImportBatch[] };
  addBatch: (batch: ImportBatch, clients: ClientFile[], documents: Doc[]) => void;
  clearDataset: () => void;
  /** The merged book: shipped records plus the session dataset, with accepted discoveries on today's list, and the rules added this session. */
  book: { clients: ClientFile[]; documents: Doc[]; opportunities: Opportunity[]; rules: RuleDefinition[] };
  /** What the advisor did with each discovery candidate. Accepting puts it on today's list for the session. */
  /** Notes an agent drafted and a person filed into a client record, for the session. In production a CRM write through the connector. */
  notesAdded: Record<string, TeamNote[]>;
  addNote: (clientId: string, note: TeamNote) => void;
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

export interface AgentRequest {
  id: string;
  at: string;
  advisorId: string;
  agentId: string;
  agentName: string;
  /** "enabled", "deleted", "cadence" or "removeRule". */
  field: string;
  from: string;
  to: string;
  /** In the advisor's words: why. */
  reason: string;
  /** What the change means, in one line a principal reads. */
  summary: string;
  status: "pending" | "approved" | "refused";
  decidedBy?: string;
  comment?: string;
}

/** Where the ranking desk keeps each advisor's tuned weights in this browser. */
const TUNED_KEY = "relay.tuned.v1";

export function StateProvider({ children, initialAdvisorId }: { children: ReactNode; /** For server renders in tests; the app starts on the default advisor. */ initialAdvisorId?: string }) {
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
  const [notesAdded, setNotesAdded] = useState<Record<string, TeamNote[]>>({});
  const [addedRules, setAddedRules] = useState<RuleDefinition[]>([]);
  const [tuned, setTuned] = useState<Record<string, Values>>({});
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [agentRequests, setAgentRequests] = useState<AgentRequest[]>([]);
  const [rosterOff, setRosterOff] = useState<Record<string, string[]>>({});
  const logAgent = (agentId: string, advisorId: string, field: string, from: string, to: string, actor: string, reason: string, approvedBy?: string) =>
    setRuleEdits((l) => [...l, { id: `e-${String(l.length + 1).padStart(3, "0")}`, at: new Date().toISOString(), actor, target: "agent", layer: "advisor", layerId: advisorId, agentId, field, from, to, reason, ...(approvedBy ? { approvedBy } : {}) }]);
  const [advisorId, setAdvisorId] = useState<string>(initialAdvisorId ?? APP.defaultAdvisorId);
  // Tuned settings (the ranking desk) are the advisor's own preference, so they are kept in this browser
  // across reloads, per advisor. Everything else in a session resets on reload, as documented.
  const [tunedLoaded, setTunedLoaded] = useState(false);
  // Who is signed in is session state like the rest: a reload starts as the default advisor, so a page
  // never renders one advisor and then switches to another under you.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TUNED_KEY);
      if (saved) setTuned(JSON.parse(saved) as Record<string, Values>);
    } catch { /* storage unavailable: the tuning lasts for the session */ }
    setTunedLoaded(true);
  }, []);
  useEffect(() => {
    if (!tunedLoaded) return;
    try { window.localStorage.setItem(TUNED_KEY, JSON.stringify(tuned)); } catch { /* storage unavailable */ }
  }, [tuned, tunedLoaded]);
  // Built once per change, not per render, so every screen's memo over the book holds.
  const book = useMemo(() => {
    const withNotes = (c: ClientFile): ClientFile => (notesAdded[c.id]?.length ? { ...c, notes: [...c.notes, ...notesAdded[c.id]] } : c);
    return {
      // A connected record with a shipped id (a message file naming a shipped household) replaces the shipped one for the session.
      clients: [...CLIENTS.filter((c) => !dataset.clients.some((d) => d.id === c.id)), ...dataset.clients].map(withNotes),
      documents: [...CORPUS, ...dataset.documents],
      opportunities: [...OPPORTUNITIES, ...dataset.clients.flatMap((c) => c.opportunities), ...acceptedDiscoveries],
      // Rules read from a policy, and the one rule each advisor's own agent runs.
      rules: [...addedRules, ...customAgents.map((c) => c.rule)],
    };
  }, [dataset, notesAdded, acceptedDiscoveries, addedRules, customAgents]);
  const overlay: Overlay = useMemo(() => {
    const o: Overlay = { tuned };
    for (const s of learned) {
      const side = (o[s.scope] ??= {});
      const vals = (side[s.scopeId] ??= {});
      vals[s.key] = applied(s, vals[s.key]);
    }
    return o;
  }, [learned, tuned]);
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
    advisorId,
    setAdvisorId,
    customAgents,
    createAgent: (a, actor) => {
      setCustomAgents((l) => [...l, a]);
      logAgent(a.agent.id, a.advisorId, "created", "", a.agent.name, actor, `Made from a template: ${a.rule.title}.`);
    },
    updateAgent: (id, patch, actor) => {
      const c = customAgents.find((x) => x.agent.id === id);
      if (!c) return;
      const param = c.rule.params[0];
      const next: CustomAgent = {
        ...c,
        agent: { ...c.agent, ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.mission !== undefined ? { mission: patch.mission } : {}), ...(patch.cadence ? { cadence: patch.cadence } : {}), ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}) },
        rule: patch.value !== undefined && param ? { ...c.rule, params: [{ ...param, value: patch.value }] } : c.rule,
      };
      setCustomAgents((l) => l.map((x) => (x.agent.id === id ? next : x)));
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) logAgent(id, c.advisorId, k === "value" ? param?.key ?? "value" : k, String(k === "value" ? param?.value : (c.agent as unknown as Record<string, unknown>)[k] ?? ""), String(v), actor, "Edited by its owner.");
    },
    deleteAgent: (id, actor) => {
      const c = customAgents.find((x) => x.agent.id === id);
      if (!c) return;
      setCustomAgents((l) => l.filter((x) => x.agent.id !== id));
      logAgent(id, c.advisorId, "deleted", c.agent.name, "true", actor, "Deleted by its owner. Its open findings close with it.");
    },
    agentRequests,
    requestAgentChange: (r) => setAgentRequests((l) => [...l, { ...r, id: `req-${l.length + 1}`, at: new Date().toISOString(), status: "pending" }]),
    decideAgentRequest: (id, approve, by, comment) => {
      const r = agentRequests.find((x) => x.id === id);
      if (!r || r.status !== "pending") return;
      setAgentRequests((l) => l.map((x) => (x.id === id ? { ...x, status: approve ? "approved" : "refused", decidedBy: by, comment } : x)));
      if (approve) logAgent(r.agentId, r.advisorId, r.field, r.from, r.to, by, `${r.reason} Requested by the advisor; approved by a principal.`, by);
    },
    rosterOff,
    setRosterOn: (aid, agentId, on) => setRosterOff((m) => ({ ...m, [aid]: on ? (m[aid] ?? []).filter((x) => x !== agentId) : [...new Set([...(m[aid] ?? []), agentId])] })),
    tuned,
    tune: (advisorId, key, value) => setTuned((t) => ({ ...t, [advisorId]: { ...(t[advisorId] ?? {}), [key]: value } })),
    resetTuning: (advisorId) => setTuned((t) => { const next = { ...t }; delete next[advisorId]; return next; }),
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
    notesAdded,
    addNote: (clientId, note) => setNotesAdded((s) => ({ ...s, [clientId]: [...(s[clientId] ?? []), note] })),
    discoveryDecisions,
    decideDiscovery: (k, decision) => {
      setDiscoveryDecisions((s) => ({ ...s, [k.id]: { decision, at: new Date().toISOString() } }));
      if (decision === "accepted") setAcceptedDiscoveries((l) => [...l.filter((o) => o.id !== `opp-${k.id.replace(/^disc-/, "")}`), toOpportunity(k)]);
    },
    actionDecisions,
    decideAction: (id, decision, reason) => setActionDecisions((s) => ({ ...s, [id]: { decision, at: new Date().toISOString(), reason } })),
    addedRules,
    addRule: (rule, agentId, actor, reason) => {
      setAddedRules((l) => [...l.filter((r) => r.id !== rule.id), rule]);
      setRuleEdits((l) => [...l, { id: `e-${String(l.length + 1).padStart(3, "0")}`, at: new Date().toISOString(), actor, target: "agent", layer: "firm", layerId: "firm", agentId, field: "addRule", from: "", to: rule.id, reason }]);
    },
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
