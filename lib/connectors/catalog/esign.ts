import type { ConnectorDefinition } from "@/lib/connectors/types";

export const esign: ConnectorDefinition = {
  id: "esign",
  name: "E-signature",
  vendor: "DocuSign",
  channel: "esign",
  summary: "Executed agreements and disclosure acknowledgements.",
  capabilities: ["ingest_incremental", "read_metadata"],
  produces: ["signed_document"],
  retention: "system_of_record",
  supervisoryNote: "Proves the client received and acknowledged a disclosure, which is the difference between a delivered disclosure and an asserted one.",
  feedsRules: ["reg-bi-disclosure", "sec-17a4-completeness"],
};
