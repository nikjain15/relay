import type { ConnectorDefinition } from "@/lib/connectors/types";

export const archive: ConnectorDefinition = {
  id: "archive",
  name: "Communications archive",
  vendor: "Smarsh, Global Relay or Proofpoint",
  channel: "archive",
  summary: "The firm's retained, tamper-evident copy of every captured channel.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata"],
  produces: ["email_message", "sms_message", "chat_message", "social_post"],
  retention: "system_of_record",
  supervisoryNote: "The 17a-4 copy. Relay reconciles against it rather than becoming a second archive, because two archives that disagree is worse than one.",
  feedsRules: ["sec-17a4-completeness", "off-channel-gap"],
};
