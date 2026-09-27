import type { ConnectorDefinition } from "@/lib/connectors/types";

export const wealthbox: ConnectorDefinition = {
  id: "wealthbox",
  name: "Wealthbox CRM",
  vendor: "Wealthbox",
  channel: "crm",
  summary: "Contacts, notes, tasks and the activity stream.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata"],
  produces: ["crm_note"],
  retention: "supplemental",
  supervisoryNote: "A note typed here is the advisor's own account of a conversation; the agents read it beside the captured record.",
  satisfies: ["salesforce-fsc"],
};
