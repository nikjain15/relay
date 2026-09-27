// The catalog. Adding a connector is: write one file beside this one, import it
// here, add it to the array. Removing one is deleting those two lines. Nothing
// else in the app imports a connector directly.
import type { ConnectorDefinition } from "@/lib/connectors/types";
import { microsoft365 } from "./microsoft-365";
import { zoom } from "./zoom";
import { compliantTexting } from "./compliant-texting";
import { teamsChat } from "./teams-chat";
import { whatsapp } from "./whatsapp";
import { linkedin } from "./linkedin";
import { salesforceFsc } from "./salesforce-fsc";
import { custodianFeed } from "./custodian-feed";
import { archive } from "./archive";
import { esign } from "./esign";
import { redtail } from "./redtail";
import { wealthbox } from "./wealthbox";
import { dynamics365 } from "./dynamics-365";
import { hubspot } from "./hubspot";
import { ubsWorkstation } from "./ubs-workstation";
import { schwabAdvisorCenter } from "./schwab-advisor-center";
import { fidelityWealthscape } from "./fidelity-wealthscape";
import { pershingNetx360 } from "./pershing-netx360";
import { orion } from "./orion";
import { tamarac } from "./tamarac";
import { blackDiamond } from "./black-diamond";
import { emoney } from "./emoney";
import { moneyguidepro } from "./moneyguidepro";

// Within each kind the order is the order a connector is shown in: the firm's
// own workstation first, then the market leaders, largest first, then the
// generic source a rule names. Sources renders them in exactly this order.
export const CATALOG: ConnectorDefinition[] = [
  // CRM
  ubsWorkstation,
  salesforceFsc,
  redtail,
  wealthbox,
  dynamics365,
  hubspot,
  // Custodian
  schwabAdvisorCenter,
  fidelityWealthscape,
  pershingNetx360,
  custodianFeed,
  // Portfolio and reporting
  orion,
  tamarac,
  blackDiamond,
  // Planning
  emoney,
  moneyguidepro,
  // Channels
  microsoft365,
  zoom,
  compliantTexting,
  teamsChat,
  whatsapp,
  linkedin,
  archive,
  esign,
];

/** Where a connector sits in the catalogue's order; Sources sorts by it. */
export const catalogRank = (id: string): number => {
  const i = CATALOG.findIndex((c) => c.id === id);
  return i < 0 ? CATALOG.length : i;
};
