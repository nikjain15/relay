import type { ConnectorDefinition } from "@/lib/connectors/types";

export const zoom: ConnectorDefinition = {
  id: "zoom",
  name: "Zoom meetings",
  vendor: "Zoom",
  channel: "meeting",
  summary: "Client meeting recordings and transcripts.",
  capabilities: ["ingest_incremental", "read_metadata", "read_participants", "read_transcript"],
  produces: ["meeting_transcript", "calendar_event"],
  retention: "supplemental",
  supervisoryNote: "A recommendation made aloud in a meeting is still a recommendation. Transcripts are the only evidence it happened.",
};
