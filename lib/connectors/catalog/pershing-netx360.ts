import type { ConnectorDefinition } from "@/lib/connectors/types";

export const pershingNetx360: ConnectorDefinition = {
  id: "pershing-netx360",
  name: "Pershing NetX360",
  vendor: "BNY Pershing",
  channel: "custodian",
  summary: "Positions and trades for accounts cleared through Pershing.",
  capabilities: ["ingest_incremental", "read_metadata"],
  produces: ["trade_confirm", "position_snapshot"],
  retention: "system_of_record",
  supervisoryNote: "Clearing-firm data for broker-dealer accounts; suitability drift is measured from it.",
  satisfies: ["custodian-feed"],
};
