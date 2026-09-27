import type { ConnectorDefinition } from "@/lib/connectors/types";

export const redtail: ConnectorDefinition = {
  id: "redtail",
  name: "Redtail CRM",
  vendor: "Redtail Technology",
  channel: "crm",
  summary: "Contacts, notes, activities and workflows, read in place.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata"],
  produces: ["crm_note"],
  retention: "supplemental",
  supervisoryNote: "The CRM most independent practices already run. Relay reads its notes and writes nothing back.",
  satisfies: ["salesforce-fsc"],
};
