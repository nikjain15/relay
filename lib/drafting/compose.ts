// The prototype composes client notes from fixed fragments, only from the
// approved candidate, the household's own figures and a cited passage. In
// production the model would compose language here; eligibility, amounts and
// citations would still come from the deterministic modules.
import type { Evaluation, Household, Opportunity, Passage, Product } from "@/lib/types";
import { CORPUS } from "@/lib/fixtures/corpus";
import { usd } from "@/lib/format";
import { POLICY } from "@/lib/data/policy";

const VERB: Record<string, [string, string]> = {
  new_cash: ["placing", "in"],
  rebalance_from_core: ["moving", "into"],
  sell_long_term_lots: ["selling long-term lots worth", "and moving it into"],
  sell_all_lots: ["selling", "and moving it into"],
  contribute_in_kind: ["contributing", "to"],
};

export interface Draft {
  text: string;
  sources: string[];
  citedTitles: string[];
}

/** The people a client note is addressed to. Beneficiaries are not, so they are not recipients either. */
export function addressees(h: Household) {
  const named = h.persons.filter((p) => p.role !== "beneficiary");
  return named.length ? named : h.persons.slice(0, 1);
}

/** `length` comes from the client's resolved profile. Brief drops the quoted passage but keeps the figures, the citation and the disclosure. */
export function compose(h: Household, opp: Opportunity, ev: Evaluation, product: Product, evidence: Passage[], opts: { length?: "full" | "brief" } = {}): Draft {
  const brief = opts.length === "brief";
  const goal = h.goals.find((g) => g.strategy === opp.strategy);
  const goalLine =
    goal && goal.unit === "months" && goal.strategy === "Liquidity"
      ? `your cash set aside for planned spending covers ${goal.funded} of ${goal.target} months`
      : goal && goal.unit === "months"
        ? `your ${goal.strategy.toLowerCase()} goal covers ${goal.funded} of ${goal.target} months`
        : goal
          ? `your ${goal.strategy.toLowerCase()} goal is funded at ${usd(goal.funded)} of ${usd(goal.target)}`
          : `this affects your ${opp.strategy.toLowerCase()} goal`;
  const passage = evidence[0];
  const disclosure = CORPUS.find((d) => d.id === POLICY.communications.disclosureDocId)!.passages[0];
  const firstNames = addressees(h).map((p) => p.name).join(" and ");
  const amount = usd(ev.candidate.amountUsd);
  const opener = opp.clientNote ?? `We noted a change on your account: ${opp.title.charAt(0).toLowerCase()}${opp.title.slice(1)}.`;
  const [verb, prep] = VERB[ev.candidate.source];
  const productName = product.plainPhrase ?? `the ${product.name.toLowerCase()}`;
  const text = [
    `Dear ${firstNames},`,
    "",
    `${opener} At present, ${goalLine}.`,
    `One option to discuss is ${verb} ${amount} ${prep} ${productName}.${passage && !brief ? ` ${passage.text}` : ""}`,
    passage ? `[Source: ${passage.title}, prototype corpus, day ${passage.day}]` : "",
    "",
    disclosure,
  ].join("\n");
  const sources = [opp.title, opener, goalLine, amount, ...evidence.map((p) => p.text)];
  return { text, sources, citedTitles: [...new Set(evidence.map((p) => p.title))] };
}
