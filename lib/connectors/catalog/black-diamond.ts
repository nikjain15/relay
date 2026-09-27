import type { ConnectorDefinition } from "@/lib/connectors/types";

export const blackDiamond: ConnectorDefinition = {
  id: "black-diamond",
  name: "Black Diamond",
  vendor: "SS&C Advent",
  channel: "portfolio",
  summary: "Portfolio reporting and the client portal's figures.",
  capabilities: ["ingest_history", "ingest_incremental", "read_metadata"],
  produces: ["position_snapshot"],
  retention: "supplemental",
  supervisoryNote: "The numbers the client has already seen, so a note never quotes a figure the client cannot find.",
};
