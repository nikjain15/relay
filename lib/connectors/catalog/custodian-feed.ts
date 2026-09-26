import type { ConnectorDefinition } from "@/lib/connectors/types";

export const custodianFeed: ConnectorDefinition = {
  id: "custodian-feed",
  name: "Custodian positions and trades",
  vendor: "Schwab, Fidelity or Pershing",
  channel: "custodian",
  summary: "Nightly positions and executed trades.",
  capabilities: ["ingest_incremental", "read_metadata"],
  produces: ["trade_confirm", "position_snapshot"],
  retention: "system_of_record",
  supervisoryNote: "Ties a recommendation to what actually happened in the account, which is how suitability drift becomes measurable.",
};
