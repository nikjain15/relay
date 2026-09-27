"use client";

// The one place a screen gets "your" data: the signed-in advisor's view of
// the session book, with this session's decisions applied. See
// lib/view/advisor-view.ts for why there is exactly one.
import { useMemo } from "react";
import { useRelay } from "@/components/state";
import { advisorView, type AdvisorView } from "@/lib/view/advisor-view";

export function useView(): AdvisorView {
  const { book, advisorId, ruleEdits, connections, caseDispositions, actionDecisions, dismissed, overlay, customAgents } = useRelay();
  return useMemo(
    () => advisorView(book, advisorId, { ruleEdits, connections, caseDispositions, actionDecisions, dismissed, overlay, customAgents }),
    [book, advisorId, ruleEdits, connections, caseDispositions, actionDecisions, dismissed, overlay, customAgents],
  );
}
