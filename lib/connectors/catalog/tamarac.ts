import type { ConnectorDefinition } from "@/lib/connectors/types";

export const tamarac: ConnectorDefinition = {
  id: "tamarac",
  name: "Envestnet Tamarac",
  vendor: "Envestnet",
  channel: "portfolio",
  summary: "Rebalancing, reporting and the household ledger.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata"],
  produces: ["position_snapshot"],
  retention: "supplemental",
  supervisoryNote: "Where a model drift is first visible to the advisor; Relay reads the same figures.",
};
