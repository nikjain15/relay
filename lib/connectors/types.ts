// Connector contract.
//
// Relay ingests. It never sends. That is not a convention here, it is a
// property of this type: there is no write or send capability in the union
// below, so a connector that could transmit cannot be expressed. The
// dependency-cruiser rule `connectors-are-read-only` enforces the same thing at
// the import level, and tests/invariants asserts it again.
//
// Adding a channel or a connector is meant to be cheap: add a `ChannelKind`,
// drop one file in catalog/, and export it from catalog/index.ts. Nothing else
// in the app needs to know.

/** A medium an advisor communicates or records business through. */
export type ChannelKind =
  | "email"
  | "calendar"
  | "meeting"
  | "voice"
  | "sms"
  | "chat"
  | "social"
  | "crm"
  | "custodian"
  | "archive"
  | "esign"
  | "planning"
  | "portfolio";

/** What a connector may do. Read verbs only, by design. */
export type ReadCapability =
  | "ingest_history"
  | "ingest_incremental"
  | "read_metadata"
  | "read_participants"
  | "read_attachments"
  | "read_transcript";

/**
 * The kinds of record a connector can produce. Drives the completeness model:
 * a record class an advisor generates but nothing ingests is an off-channel gap.
 */
export type RecordClass =
  | "email_message"
  | "calendar_event"
  | "meeting_transcript"
  | "voice_call"
  | "sms_message"
  | "chat_message"
  | "social_post"
  | "crm_note"
  | "trade_confirm"
  | "position_snapshot"
  | "signed_document"
  | "plan_output";

export type ConnectionStatus = "connected" | "available" | "degraded" | "unsupported";

/**
 * Books-and-records posture. A connector that is the firm's retained copy under
 * SEC Rule 17a-4 carries different weight from one that merely reads a surface.
 */
export type RetentionRole = "system_of_record" | "supplemental" | "none";

export interface ConnectorDefinition {
  id: string;
  name: string;
  vendor: string;
  channel: ChannelKind;
  /** One line an advisor would understand, not a feature list. */
  summary: string;
  capabilities: ReadCapability[];
  produces: RecordClass[];
  retention: RetentionRole;
  /**
   * Why a compliance officer cares that this is connected.
   *
   * Which rules depend on this connector is deliberately NOT stored here. A rule
   * already names the connectors it requires, and holding the same relationship
   * in two files means the two drift: a test caught the archive omitting a rule
   * that requires it. The mapping is derived in lib/compliance/sources.ts, which
   * this module may not import (connectors decide nothing).
   */
  supervisoryNote: string;
  /**
   * Connector ids this one stands in for. A rule names the generic source it
   * needs ("custodian-feed"); connecting any custodian that produces the same
   * records satisfies it. Read by the sweep, never by a connector.
   */
  satisfies?: string[];
}

/** Per-advisor connection state. Lives in data/, not in the definition. */
export interface ConnectionState {
  connectorId: string;
  advisorId: string;
  status: ConnectionStatus;
  /** ISO date of the last successful ingest, when connected. */
  lastIngestAt?: string;
  recordsIngested?: number;
  /** Set when status is degraded: what is wrong, in one line. */
  issue?: string;
}

/** A channel the advisor has attested to using, whether or not it is connected. */
export interface ChannelAttestation {
  advisorId: string;
  channel: ChannelKind;
  used: boolean;
  /** Free text from the advisor's attestation, shown verbatim in the gap report. */
  note?: string;
}
