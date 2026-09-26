import type { ConnectorDefinition } from "@/lib/connectors/types";

export const teamsChat: ConnectorDefinition = {
  id: "teams-chat",
  name: "Microsoft Teams chat",
  vendor: "Microsoft",
  channel: "chat",
  summary: "Internal and external Teams messages.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata", "read_participants"],
  produces: ["chat_message"],
  retention: "system_of_record",
  supervisoryNote: "External Teams chat with a client is business correspondence and is retained on the same footing as email.",
};
