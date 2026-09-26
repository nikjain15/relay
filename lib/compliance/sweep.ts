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
import { accountFacts, coverageFacts } from "@/lib/compliance/facts";
import { ACCOUNT_INPUTS, CLIENTS, CONNECTORS_DATA, SERVICE_REQUESTS } from "@/lib/data";

export interface Sweep {
  cases: Case[];
  /** Connectors a rule needed and did not have, so the gap is visible as a gap. */
  blockedBy: string[];
  /** Clients the sweep covered, so "nothing found" can be distinguished from "nothing ran". */
  accountsScanned: number;
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
      trustedContactOnFile: inputs?.trustedContactOnFile ?? false,
      complaintLogged: inputs?.complaintLogged ?? false,
      unusualDisbursement: inputs?.unusualDisbursement,
      newThirdPartyContact: inputs?.newThirdPartyContact,
    });
    runs.push(...runScope(policy, { ...facts, availableConnectors: connected }));
  }

  return {
    cases: queue(runs),
    blockedBy: [...new Set(runs.flatMap((r) => r.blockedBy))],
    accountsScanned: mine.length,
  };
}
