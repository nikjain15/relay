import type { ConnectorDefinition } from "@/lib/connectors/types";

export const dynamics365: ConnectorDefinition = {
  id: "dynamics-365",
  name: "Microsoft Dynamics 365",
  vendor: "Microsoft",
  channel: "crm",
  summary: "Client records and activities from the firm's Dynamics tenant.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata"],
  produces: ["crm_note"],
  retention: "supplemental",
  supervisoryNote: "Common where the firm already runs Microsoft; the same read-only posture as every other CRM here.",
  satisfies: ["salesforce-fsc"],
};
