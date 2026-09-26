import type { ConnectorDefinition } from "@/lib/connectors/types";

export const compliantTexting: ConnectorDefinition = {
  id: "compliant-texting",
  name: "Compliant texting",
  vendor: "Hearsay, MyRepChat or Redtail Speak",
  channel: "sms",
  summary: "Client texting on a supervised number, captured and retained.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata", "read_participants"],
  produces: ["sms_message"],
  retention: "system_of_record",
  supervisoryNote: "The supervised alternative to a personal phone. Its whole purpose is that texting stops being off-channel.",
};
