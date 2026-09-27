import type { ConnectorDefinition } from "@/lib/connectors/types";

export const schwabAdvisorCenter: ConnectorDefinition = {
  id: "schwab-advisor-center",
  name: "Schwab Advisor Center",
  vendor: "Charles Schwab",
  channel: "custodian",
  summary: "Positions, balances and executed trades for accounts custodied at Schwab.",
  capabilities: ["ingest_incremental", "read_metadata"],
  produces: ["trade_confirm", "position_snapshot"],
  retention: "system_of_record",
  supervisoryNote: "What actually happened in the account, from the custodian rather than the advisor.",
  satisfies: ["custodian-feed"],
};
