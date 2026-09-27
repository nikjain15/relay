import type { ConnectorDefinition } from "@/lib/connectors/types";

export const fidelityWealthscape: ConnectorDefinition = {
  id: "fidelity-wealthscape",
  name: "Fidelity Wealthscape",
  vendor: "Fidelity Institutional",
  channel: "custodian",
  summary: "Positions, balances and trades for accounts custodied at Fidelity.",
  capabilities: ["ingest_incremental", "read_metadata"],
  produces: ["trade_confirm", "position_snapshot"],
  retention: "system_of_record",
  supervisoryNote: "The same custodian posture as Schwab: a nightly feed that ties advice to outcomes.",
  satisfies: ["custodian-feed"],
};
