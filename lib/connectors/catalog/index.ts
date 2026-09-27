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

export const CATALOG: ConnectorDefinition[] = [
  microsoft365,
  zoom,
  compliantTexting,
  teamsChat,
  whatsapp,
  linkedin,
  salesforceFsc,
  custodianFeed,
  archive,
  esign,
  redtail,
  wealthbox,
  dynamics365,
  hubspot,
  ubsWorkstation,
  schwabAdvisorCenter,
  fidelityWealthscape,
  pershingNetx360,
  orion,
  tamarac,
  blackDiamond,
  emoney,
  moneyguidepro,
];
