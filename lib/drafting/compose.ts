// The prototype composes client notes from fixed fragments, only from the
// approved candidate, the household's own figures and a cited passage. In
// production the model would compose language here; eligibility, amounts and
// citations would still come from the deterministic modules.
import type { Evaluation, Household, Opportunity, Passage, Product } from "@/lib/types";
import { CORPUS } from "@/lib/fixtures/corpus";
import { usd } from "@/lib/format";

const VERB: Record<string, string> = {
  new_cash: "placing",
  rebalance_from_core: "moving",
  sell_long_term_lots: "selling long-term lots worth",
  sell_all_lots: "selling",
  contribute_in_kind: "contributing",
};

export interface Draft {
  text: string;
  sources: string[];
  citedTitles: string[];
}

export function compose(h: Household, opp: Opportunity, ev: Evaluation, product: Product, evidence: Passage[]): Draft {
  const goal = h.goals.find((g) => g.strategy === opp.strategy);
  const goalLine =
    goal && goal.unit === "months"
      ? `your ${goal.strategy} strategy currently covers ${goal.funded} of ${goal.target} months of planned spending`
      : goal
        ? `your ${goal.strategy} strategy is funded at ${usd(goal.funded)} of ${usd(goal.target)}`
        : `this affects your ${opp.strategy} strategy`;
  const passage = evidence[0];
  const disclosure = CORPUS.find((d) => d.id === "doc-disclosure")!.passages[0];
  const firstNames = h.persons.filter((p) => p.role !== "beneficiary").map((p) => p.name).join(" and ");
  const amount = usd(ev.candidate.amountUsd);
  const text = [
    `Dear ${firstNames},`,
    "",
    `We noted a change on your account: ${opp.title.charAt(0).toLowerCase()}${opp.title.slice(1)}. At present ${goalLine}.`,
    `One option to discuss is ${VERB[ev.candidate.source]} ${amount} in the ${product.name.toLowerCase()}. ${passage ? passage.text : ""}`,
    passage ? `[Source: ${passage.title}, prototype corpus, day ${passage.day}]` : "",
    "",
    disclosure,
  ].join("\n");
  const sources = [opp.title, goalLine, amount, ...evidence.map((p) => p.text)];
  return { text, sources, citedTitles: [...new Set(evidence.map((p) => p.title))] };
}
