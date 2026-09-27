import type { ConnectorDefinition } from "@/lib/connectors/types";

export const hubspot: ConnectorDefinition = {
  id: "hubspot",
  name: "HubSpot CRM",
  vendor: "HubSpot",
  channel: "crm",
  summary: "Contacts, deals and logged activity.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata"],
  produces: ["crm_note"],
  retention: "supplemental",
  supervisoryNote: "Often the prospect pipeline rather than the client record. Read for what was promised before an account existed.",
  satisfies: ["salesforce-fsc"],
};
