// The standing sweep: what the agents find across an advisor's book without
// anyone asking.
//
// This is the difference between a compliance feature and a compliance system.
// A check that runs when an advisor submits a draft catches what the advisor
// brings you. A sweep catches the account nobody opened this week: the
// 79-year-old whose beneficiary changed, the channel that stopped recording, the
// concentration that drifted past the ceiling. It runs on a cadence, it raises
// cases, and it dispositions nothing.
//
// Deterministic. No model client may be imported here.
import type { ConnectionState } from "@/lib/connectors/types";
import { coverageFor } from "@/lib/connectors/coverage";
import type { Case } from "@/lib/compliance/agents";
import { queue, runScope } from "@/lib/compliance/agents";
import type { ResolvedPolicy } from "@/lib/compliance/policy";
import { accountFacts, coverageFacts, messageFacts } from "@/lib/compliance/facts";
import { ACCOUNT_INPUTS, ADVISOR_INPUTS, CLIENTS, CONNECTORS_DATA, MESSAGES, SERVICE_REQUESTS, SNAPSHOTS } from "@/lib/data";

export interface Sweep {
  cases: Case[];
  /** Connectors a rule needed and did not have, so the gap is visible as a gap. */
  blockedBy: string[];
  /** Clients the sweep covered, so "nothing found" can be distinguished from "nothing ran". */
  accountsScanned: number;
  /** Captured messages the surveillance agent read, and the channels they came from. */
  messagesScanned: number;
  channelsScanned: string[];
  /** Messages on a source that is not connected and healthy: in the corpus, not swept, and said so. */
  messagesNotSwept: { id: string; connectorId: string; channel: string }[];
}

export function connectedIds(advisorId: string, states: ConnectionState[]): string[] {
  return states.filter((s) => s.advisorId === advisorId && s.status === "connected").map((s) => s.connectorId);
}

export function sweep(advisorId: string, policy: ResolvedPolicy, states: ConnectionState[]): Sweep {
  const connected = connectedIds(advisorId, states);
  const report = coverageFor(advisorId, states, CONNECTORS_DATA.attestations);
  const custodianConnected = connected.includes("custodian-feed");

  const runs = runScope(policy, { ...coverageFacts(report), availableConnectors: connected });

  const mine = CLIENTS.filter((c) => c.advisorId === advisorId);
  for (const client of mine) {
    const inputs = ACCOUNT_INPUTS.accounts.find((a) => a.clientId === client.id);
    const facts = accountFacts({
      client,
      requests: SERVICE_REQUESTS.filter((r) => r.clientId === client.id),
      custodianConnected,
      history: SNAPSHOTS.series.find((x) => x.clientId === client.id)?.concentrationPct,
      trustedContactOnFile: inputs?.trustedContactOnFile ?? false,
      complaintLogged: inputs?.complaintLogged ?? false,
      unusualDisbursement: inputs?.unusualDisbursement,
      newThirdPartyContact: inputs?.newThirdPartyContact,
    });
    runs.push(...runScope(policy, { ...facts, availableConnectors: connected }));
  }

  // The corpus, not the inbox: every captured message on a healthy source, in
  // both directions, against the communication rules. A message whose source
  // is degraded is not silently skipped; it is counted as not swept.
  const obaOnFile = ADVISOR_INPUTS.advisors.find((a) => a.advisorId === advisorId)?.obaOnFile ?? false;
  const messages = MESSAGES.messages.filter((m) => m.advisorId === advisorId);
  const swept = messages.filter((m) => connected.includes(m.connectorId));
  for (const m of swept) {
    const inputs = ACCOUNT_INPUTS.accounts.find((a) => a.clientId === m.clientId);
    runs.push(...runScope(policy, {
      ...messageFacts(m, { obaOnFile, complaintLogged: inputs?.complaintLogged ?? false, channelApproved: true }),
      availableConnectors: connected,
    }));
  }

  return {
    cases: queue(runs),
    blockedBy: [...new Set(runs.flatMap((r) => r.blockedBy))],
    accountsScanned: mine.length,
    messagesScanned: swept.length,
    channelsScanned: [...new Set(swept.map((m) => m.channel))],
    messagesNotSwept: messages.filter((m) => !connected.includes(m.connectorId)).map((m) => ({ id: m.id, connectorId: m.connectorId, channel: m.channel })),
  };
}
