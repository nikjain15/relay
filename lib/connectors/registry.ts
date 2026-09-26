// Connector registry. The only way the app reaches a connector.
//
// Deliberately a lookup over the catalog rather than a class hierarchy: a
// connector is data plus a declared contract, so add, replace and remove stay
// one-file operations and nothing inherits behaviour it did not ask for.
import type { ChannelKind, ConnectorDefinition, RecordClass } from "@/lib/connectors/types";
import { CATALOG } from "@/lib/connectors/catalog";

const BY_ID = new Map<string, ConnectorDefinition>(CATALOG.map((c) => [c.id, c]));

export function listConnectors(): ConnectorDefinition[] {
  return [...CATALOG].sort((a, b) => a.name.localeCompare(b.name));
}

export function getConnector(id: string): ConnectorDefinition | undefined {
  return BY_ID.get(id);
}

export function connectorsForChannel(channel: ChannelKind): ConnectorDefinition[] {
  return CATALOG.filter((c) => c.channel === channel);
}

// Which connectors a rule depends on used to be answered here, from a list on
// each connector. It is answered in lib/compliance/sources.ts instead, derived
// from the rules' own `requires`. Two copies of one relationship drift, and this
// one had: the archive omitted a rule that requires it. This module also may not
// import lib/compliance, because a connector decides nothing.

/** Record classes the connected set can actually produce. */
export function producedBy(connectorIds: string[]): Set<RecordClass> {
  const out = new Set<RecordClass>();
  for (const id of connectorIds) for (const r of BY_ID.get(id)?.produces ?? []) out.add(r);
  return out;
}

/** Ids in the catalog, for validation and tests. */
export function connectorIds(): string[] {
  return CATALOG.map((c) => c.id);
}
