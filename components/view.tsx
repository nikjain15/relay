"use client";

// The one place a screen gets "your" data: the signed-in advisor's view of
// the session book, with this session's decisions applied. See
// lib/view/advisor-view.ts for why there is exactly one.
//
// It is computed once per change, by ViewProvider, and every component that
// calls useView() reads that one result: the header, the persona line, the
// page and Ask cannot disagree, and the sweep does not run once per caller.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRelay } from "@/components/state";
import { advisorView, type AdvisorView } from "@/lib/view/advisor-view";

const Ctx = createContext<AdvisorView | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const { book, advisorId, ruleEdits, connections, caseDispositions, actionDecisions, dismissed, overlay, customAgents } = useRelay();
  const v = useMemo(
    () => advisorView(book, advisorId, { ruleEdits, connections, caseDispositions, actionDecisions, dismissed, overlay, customAgents }),
    [book, advisorId, ruleEdits, connections, caseDispositions, actionDecisions, dismissed, overlay, customAgents],
  );
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useView(): AdvisorView {
  const v = useContext(Ctx);
  if (!v) throw new Error("useView outside ViewProvider");
  return v;
}
