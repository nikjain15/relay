import type { Meeting, Prospect, Source } from "@/lib/types";
import type { ChannelAttestation, ConnectionState } from "@/lib/connectors/types";

// Cited composites (docs/PERSONAS.md). No real advisor is the persona; the
// public team pages are evidence that practices of this kind exist.
export interface Advisor {
  id: string;
  name: string;
  role: string;
  book: string;
  facts: { detail: string; kind: "Published" | "Derived" | "Chosen" }[];
  groundedIn: Source[];
  /** The advisor layer of the settings resolver: segment, learning on or off, advisor-level values. */
  profile?: { segmentId: string; version: number; learning: boolean; values: Record<string, unknown> };
  /** Whether an outside business activity is on file with the firm. */
  obaOnFile?: boolean;
  /** This advisor's connected sources and what they attest to using. */
  connections?: Omit<ConnectionState, "advisorId">[];
  attestations?: Omit<ChannelAttestation, "advisorId">[];
  prospects?: Omit<Prospect, "advisorId">[];
  walkthrough?: {
    label: string;
    day: string;
    households: number | string;
    alertsOvernight: number;
    summary: string;
    meetings: Meeting[];
  };
}
