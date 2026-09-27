import type { ConnectorDefinition } from "@/lib/connectors/types";

export const ubsWorkstation: ConnectorDefinition = {
  id: "ubs-workstation",
  name: "UBS advisor workstation",
  vendor: "UBS (demonstration)",
  channel: "crm",
  summary: "The wirehouse advisor desktop: client records, notes and household views.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata"],
  produces: ["crm_note", "position_snapshot"],
  retention: "system_of_record",
  supervisoryNote: "At a wirehouse the workstation is the record of the relationship. Relay reads it; the advisor keeps working in it.",
  satisfies: ["salesforce-fsc", "custodian-feed"],
};
