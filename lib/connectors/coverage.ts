// Record completeness, which is the reason the connector layer exists.
//
// The expensive failure in this industry is not a bad recommendation, it is a
// conversation nobody can produce. Regulators have fined firms heavily for
// business conducted on channels that were never captured. So the question this
// module answers is not "what is connected" but "what is the advisor using that
// nothing is capturing", and it answers it per channel with the exposure named.
//
// Deterministic. No model client may be imported here.
import type { ChannelAttestation, ChannelKind, ConnectionState, ConnectorDefinition } from "@/lib/connectors/types";
import { CATALOG } from "@/lib/connectors/catalog";

export type CoverageStatus = "covered" | "partial" | "gap" | "unused";

export interface ChannelCoverage {
  channel: ChannelKind;
  status: CoverageStatus;
  /** Connectors that are actually connected and healthy for this channel. */
  connected: ConnectorDefinition[];
  /** Catalog entries that would cover it but are not connected. */
  available: ConnectorDefinition[];
  /** Connected but not healthy. */
  degraded: ConnectorDefinition[];
  attested: boolean;
  /** Plain statement of what is wrong, or why it is fine. */
  finding: string;
  /** Named exposure when status is gap or partial. Empty otherwise. */
  exposure: string[];
  advisorNote?: string;
}

export interface CoverageReport {
  advisorId: string;
  channels: ChannelCoverage[];
  gaps: ChannelCoverage[];
  /** Share of attested channels that are fully covered, 0 to 1. */
  completeness: number;
  /** True when every channel the advisor says they use is a system of record. */
  defensible: boolean;
}

const ALL_CHANNELS: ChannelKind[] = [
  "email", "calendar", "meeting", "voice", "sms", "chat", "social", "crm", "custodian", "portfolio", "archive", "esign", "planning",
];

const GAP_EXPOSURE: Partial<Record<ChannelKind, string[]>> = {
  email: ["SEC Rule 17a-4 retention", "FINRA Rule 3110 supervisory review"],
  sms: ["SEC Rule 17a-4 retention", "FINRA Rule 3110 supervisory review"],
  chat: ["SEC Rule 17a-4 retention", "FINRA Rule 3110 supervisory review"],
  social: ["FINRA Rule 2210 retail communication", "SEC Rule 206(4)-1 marketing"],
  meeting: ["Reg BI care-obligation evidence", "FINRA Rule 2111 suitability"],
  voice: ["Reg BI care-obligation evidence", "SEC Rule 17a-4 retention"],
  custodian: ["FINRA Rule 2111 suitability drift"],
  esign: ["Reg BI disclosure delivery"],
};

export function coverageFor(
  advisorId: string,
  states: ConnectionState[],
  attestations: ChannelAttestation[],
): CoverageReport {
  const mine = states.filter((s) => s.advisorId === advisorId);
  const statusOf = new Map(mine.map((s) => [s.connectorId, s]));
  const attestedSet = new Map(
    attestations.filter((a) => a.advisorId === advisorId).map((a) => [a.channel, a]),
  );

  const channels = ALL_CHANNELS.map<ChannelCoverage>((channel) => {
    const forChannel = CATALOG.filter((c) => c.channel === channel);
    const connected = forChannel.filter((c) => statusOf.get(c.id)?.status === "connected");
    const degraded = forChannel.filter((c) => statusOf.get(c.id)?.status === "degraded");
    const available = forChannel.filter((c) => !statusOf.has(c.id) || statusOf.get(c.id)?.status === "available");
    const att = attestedSet.get(channel);
    const attested = att?.used ?? false;
    const isSor = connected.some((c) => c.retention === "system_of_record");

    let status: CoverageStatus;
    let finding: string;
    if (!attested && connected.length === 0) {
      status = "unused";
      finding = "Not used and not connected. Nothing to capture.";
    } else if (attested && connected.length === 0) {
      status = "gap";
      finding = degraded.length
        ? "In use, and the only connector for it is degraded. Treat as uncaptured until it is fixed."
        : "In use and nothing is capturing it. This is business conducted off the record.";
    } else if (attested && !isSor) {
      status = "partial";
      finding = "Captured, but no connected source is the retained copy. Evidence exists and retention does not.";
    } else if (!attested && connected.length > 0) {
      status = "covered";
      finding = "Captured, though the advisor has not attested to using it. Harmless, and worth confirming.";
    } else {
      status = "covered";
      finding = "In use and captured by a system of record.";
    }

    return {
      channel,
      status,
      connected,
      available,
      degraded,
      attested,
      finding,
      exposure: status === "gap" || status === "partial" ? (GAP_EXPOSURE[channel] ?? []) : [],
      advisorNote: att?.note,
    };
  });

  const attestedChannels = channels.filter((c) => c.attested);
  const covered = attestedChannels.filter((c) => c.status === "covered");
  return {
    advisorId,
    channels,
    gaps: channels.filter((c) => c.status === "gap" || c.status === "partial"),
    completeness: attestedChannels.length === 0 ? 1 : covered.length / attestedChannels.length,
    defensible: attestedChannels.every((c) => c.status === "covered"),
  };
}
