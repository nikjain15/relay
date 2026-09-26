"use client";

// Connected channels.
//
// The screen is built around one sentence an advisor can act on: these are the
// channels you told us you use, and this is what nothing is capturing. Gaps come
// first, with the regulation named, because a green dashboard that hides an
// uncaptured channel is worse than no dashboard.
import { useMemo } from "react";
import Link from "next/link";
import { useRelay } from "@/components/state";
import { Banner, Card, CardGrid, PageTitle, Pill, Section, StatRow, btn, btnPrimary } from "@/components/ui";
import { CATALOG } from "@/lib/connectors/catalog";
import { coverageFor, type ChannelCoverage } from "@/lib/connectors/coverage";
import type { ChannelKind, ConnectorDefinition } from "@/lib/connectors/types";
import { CONNECTORS_DATA } from "@/lib/data";

const CHANNEL_LABEL: Record<ChannelKind, string> = {
  email: "Email",
  calendar: "Calendar",
  meeting: "Video meetings",
  voice: "Phone calls",
  sms: "Text messages",
  chat: "Chat",
  social: "Social",
  crm: "CRM",
  custodian: "Custodian",
  archive: "Archive",
  esign: "E-signature",
  planning: "Planning tools",
};

const STATUS: Record<ChannelCoverage["status"], { label: string; tone: "pass" | "fail" | "neutral" | "accent" }> = {
  covered: { label: "Captured", tone: "pass" },
  partial: { label: "Not retained", tone: "fail" },
  gap: { label: "Not captured", tone: "fail" },
  unused: { label: "Not used", tone: "neutral" },
};

function ConnectorRow({ c, advisorId }: { c: ConnectorDefinition; advisorId: string }) {
  const { connections, setConnectorStatus } = useRelay();
  const state = connections.find((s) => s.advisorId === advisorId && s.connectorId === c.id);
  const status = state?.status ?? "available";
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-t border-line py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink">
          {c.name} <span className="font-normal text-ink-3">{c.vendor}</span>
        </p>
        <p className="mt-0.5 text-[13px] text-ink-2">{c.summary}</p>
        {status === "degraded" && state?.issue && <p className="mt-1 text-[13px] text-critical">{state.issue}</p>}
        {status === "connected" && (
          <p className="mt-1 text-[12px] text-ink-3">
            {c.retention === "system_of_record" ? "Retained copy" : "Read only, not the retained copy"}
            {state?.recordsIngested ? ` · ${state.recordsIngested.toLocaleString()} records` : ""}
            {state?.lastIngestAt ? ` · last read ${state.lastIngestAt}` : ""}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status === "connected" && <Pill tone="pass">Connected</Pill>}
        {status === "degraded" && <Pill tone="fail">Degraded</Pill>}
        <button
          type="button"
          className={status === "connected" ? btn : btnPrimary}
          onClick={() => setConnectorStatus(advisorId, c.id, status === "connected" ? "available" : "connected")}
        >
          {status === "connected" ? "Disconnect" : status === "degraded" ? "Reconnect" : "Connect"}
        </button>
      </div>
    </div>
  );
}

export function ConnectorsView({ advisorId }: { advisorId: string }) {
  const { connections } = useRelay();
  const report = useMemo(() => coverageFor(advisorId, connections, CONNECTORS_DATA.attestations), [advisorId, connections]);
  const gaps = report.gaps;
  const inUse = report.channels.filter((c) => c.attested || c.status === "covered");

  return (
    <>
      <PageTitle
        title="Connected channels"
        sub="Relay reads these sources. It never sends on any of them. The question this screen answers is not what is connected, it is what you are using that nothing is capturing."
      />

      <StatRow
        items={[
          { value: `${Math.round(report.completeness * 100)}%`, label: "Channels captured", tone: report.defensible ? "positive" : "critical" },
          { value: gaps.length, label: "Open gaps", tone: gaps.length ? "critical" : "positive" },
          { value: connections.filter((c) => c.advisorId === advisorId && c.status === "connected").length, label: "Connected sources" },
          { value: report.defensible ? "Yes" : "No", label: "Defensible record", tone: report.defensible ? "positive" : "critical" },
        ]}
      />

      {gaps.length > 0 && (
        <Banner tone="critical" title={`${gaps.length} ${gaps.length === 1 ? "channel is" : "channels are"} in use and not fully on the record`}>
          Completeness reads {Math.round(report.completeness * 100)} percent, which looks passable. It is not: business conducted on an
          uncaptured channel cannot be produced on request, and that is the finding that has cost firms the most.
        </Banner>
      )}

      {gaps.length > 0 && (
        <Section title="Gaps, in the order a supervisor would ask about them">
          <CardGrid cols={2}>
            {gaps.map((g) => (
              <Card
                key={g.channel}
                tone="critical"
                title={CHANNEL_LABEL[g.channel]}
                sub={g.finding}
                right={<Pill tone="fail">{STATUS[g.status].label}</Pill>}
              >
                {g.advisorNote && <p className="mb-3 border-l-2 border-line-strong pl-3 text-[13px] italic text-ink-2">{g.advisorNote}</p>}
                {g.exposure.length > 0 && (
                  <p className="mb-3 text-[13px] text-ink-2">
                    <span className="font-medium text-ink">Exposure:</span> {g.exposure.join("; ")}
                  </p>
                )}
                {g.degraded.length > 0 && (
                  <p className="mb-3 text-[13px] text-critical">
                    {g.degraded.map((d) => d.name).join(", ")} is connected but not reading. Treated as uncaptured until it is fixed.
                  </p>
                )}
                <div className="space-y-2">
                  {[...g.degraded, ...g.available].map((c) => (
                    <ConnectorRow key={c.id} c={c} advisorId={advisorId} />
                  ))}
                </div>
              </Card>
            ))}
          </CardGrid>
        </Section>
      )}

      <Section title="Every channel">
        <CardGrid cols={2}>
          {inUse.map((ch) => (
            <Card
              key={ch.channel}
              title={CHANNEL_LABEL[ch.channel]}
              sub={ch.finding}
              right={<Pill tone={STATUS[ch.status].tone}>{STATUS[ch.status].label}</Pill>}
            >
              <div>
                {[...ch.connected, ...ch.degraded, ...ch.available].map((c) => (
                  <ConnectorRow key={c.id} c={c} advisorId={advisorId} />
                ))}
              </div>
            </Card>
          ))}
        </CardGrid>
      </Section>

      <Section title="What each source feeds">
        <p className="mb-3 max-w-2xl text-[13px] text-ink-2">
          A rule that has no source cannot be evaluated, and Relay says so rather than returning a clear. This is the map between the two.
        </p>
        <CardGrid cols={3}>
          {CATALOG.map((c) => (
            <Card key={c.id} title={c.name} sub={c.supervisoryNote}>
              <p className="text-[13px] text-ink-2">
                <span className="font-medium text-ink">Feeds:</span>{" "}
                {c.feedsRules.length ? (
                  c.feedsRules.map((r, i) => (
                    <span key={r}>
                      {i > 0 && ", "}
                      <Link href={`/compliance#${r}`} className="underline">
                        {r}
                      </Link>
                    </span>
                  ))
                ) : (
                  "No rule depends on it yet."
                )}
              </p>
            </Card>
          ))}
        </CardGrid>
      </Section>
    </>
  );
}
