import type { Source } from "@/lib/types";

// Cited composites (docs/PERSONAS.md). No real advisor is the persona; the
// public team pages below are evidence that practices of this kind exist.
export interface Advisor {
  id: string;
  name: string;
  role: string;
  book: string;
  facts: { detail: string; kind: "Published" | "Derived" | "Chosen" }[];
  groundedIn: Source[];
}

export const ADVISORS: Advisor[] = [
  {
    id: "adv-a",
    name: "Advisor A",
    role: "Senior advisor, founder and executive practice, New York",
    book: "About $820M across 183 households; four relationships above $50M",
    facts: [
      { detail: "Practice built around founders, liquidity events and concentrated stock", kind: "Published" },
      { detail: "Team: advisor, junior advisor, client service associate, shared wealth strategist", kind: "Published" },
      { detail: "Book about twice UBS's reported average per advisor (about $353M to $425M)", kind: "Derived" },
      { detail: "19 years in the industry, 3 at UBS", kind: "Chosen" },
    ],
    groundedIn: [
      { label: "Founders Group, UBS New York (public team page)", url: "https://advisors.ubs.com/founders/" },
      { label: "Flatiron Partners, UBS New York (public team page)", url: "https://advisors.ubs.com/flatiron/" },
      { label: "Madison Park Partners team page: titles and team shape", url: "https://advisors.ubs.com/mpp/Meet-the-team.htm" },
      { label: "UBS on assets per advisor", url: "https://www.ubs.com/us/en/wealth-management/financial-advisor-experience/articles/financial-advisor-in-the-us.html" },
    ],
  },
  {
    id: "adv-b",
    name: "Advisor B",
    role: "Wealth Advice Center advisor, remote coverage",
    book: "About 1,000 households, each under $250K investable",
    facts: [
      { detail: "Remote, pooled coverage from the Weehawken, Charlotte or Dallas hub", kind: "Published" },
      { detail: "Clients under $250K investable", kind: "Published" },
      { detail: "About 1,000 households: 200+ professionals serving 200,000 to 300,000 clients", kind: "Derived" },
    ],
    groundedIn: [
      { label: "UBS Wealth Advice Center", url: "https://www.ubs.com/us/en/wealth-management/financial-advisor-experience/articles/wealth-advice-center.html" },
      { label: "Working with the UBS Wealth Advice Center (disclosure)", url: "https://www.ubs.com/content/dam/assets/wma/us/disclosures/wac-disclosure.pdf" },
    ],
  },
];
