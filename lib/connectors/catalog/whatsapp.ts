import type { ConnectorDefinition } from "@/lib/connectors/types";

export const whatsapp: ConnectorDefinition = {
  id: "whatsapp",
  name: "WhatsApp",
  vendor: "Meta",
  channel: "chat",
  summary: "Archived WhatsApp business messaging, where the firm permits it.",
  capabilities: ["ingest_incremental", "read_metadata", "read_participants"],
  produces: ["chat_message"],
  retention: "supplemental",
  supervisoryNote: "The single most fined channel in the industry. Either it is archived or it is prohibited; there is no third option that survives an exam.",
  feedsRules: ["off-channel-gap", "sec-17a4-completeness"],
};
