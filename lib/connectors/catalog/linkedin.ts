import type { ConnectorDefinition } from "@/lib/connectors/types";

export const linkedin: ConnectorDefinition = {
  id: "linkedin",
  name: "LinkedIn",
  vendor: "LinkedIn",
  channel: "social",
  summary: "Posts, comments and direct messages from the advisor's profile.",
  capabilities: ["ingest_incremental", "read_metadata"],
  produces: ["social_post", "chat_message"],
  retention: "supplemental",
  supervisoryNote: "A post to more than 25 retail investors is a retail communication. Endorsements and testimonials engage the marketing rule.",
  feedsRules: ["finra-2210-regime", "sec-marketing-206-4-1", "off-channel-gap"],
};
