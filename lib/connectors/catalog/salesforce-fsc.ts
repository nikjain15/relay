import type { ConnectorDefinition } from "@/lib/connectors/types";

export const salesforceFsc: ConnectorDefinition = {
  id: "salesforce-fsc",
  name: "Salesforce Financial Services Cloud",
  vendor: "Salesforce",
  channel: "crm",
  summary: "Client records, activity history and logged notes.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata"],
  produces: ["crm_note"],
  retention: "supplemental",
  supervisoryNote: "Where the advisor's own account of a conversation lives. Divergence between the note and the transcript is a supervision signal.",
};
