import type { ConnectorDefinition } from "@/lib/connectors/types";

export const emoney: ConnectorDefinition = {
  id: "emoney",
  name: "eMoney",
  vendor: "eMoney Advisor",
  channel: "planning",
  summary: "Plans, goals, cash-flow projections and linked accounts.",
  capabilities: ["ingest_history", "read_metadata"],
  produces: ["plan_output"],
  retention: "supplemental",
  supervisoryNote: "The goal the advice serves. A recommendation that ignores the plan is the finding, not the plan.",
};
