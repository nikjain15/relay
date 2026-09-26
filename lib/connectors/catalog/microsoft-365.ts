import type { ConnectorDefinition } from "@/lib/connectors/types";

export const microsoft365: ConnectorDefinition = {
  id: "microsoft-365",
  name: "Microsoft 365 mail and calendar",
  vendor: "Microsoft",
  channel: "email",
  summary: "Your firm mailbox and calendar, read in place.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata", "read_participants", "read_attachments"],
  produces: ["email_message", "calendar_event"],
  retention: "system_of_record",
  supervisoryNote: "Primary written-correspondence channel. Rule 3110 review and 17a-4 retention both assume it is complete.",
  feedsRules: ["finra-3110-correspondence", "sec-17a4-completeness", "finra-2210-regime", "off-channel-gap"],
};
