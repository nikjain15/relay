import type { ConnectorDefinition } from "@/lib/connectors/types";

export const moneyguidepro: ConnectorDefinition = {
  id: "moneyguidepro",
  name: "MoneyGuidePro",
  vendor: "Envestnet MoneyGuide",
  channel: "planning",
  summary: "Goal-based plans and probability of success.",
  capabilities: ["ingest_history", "read_metadata"],
  produces: ["plan_output"],
  retention: "supplemental",
  supervisoryNote: "Read for the client's stated goals and the plan's assumptions, never rewritten.",
};
