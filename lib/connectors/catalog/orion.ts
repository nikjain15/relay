import type { ConnectorDefinition } from "@/lib/connectors/types";

export const orion: ConnectorDefinition = {
  id: "orion",
  name: "Orion",
  vendor: "Orion Advisor Tech",
  channel: "portfolio",
  summary: "Portfolio accounting, performance and billing across custodians.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata"],
  produces: ["position_snapshot"],
  retention: "supplemental",
  supervisoryNote: "Reconciled positions across every custodian; the household view the advisor already trusts.",
};
