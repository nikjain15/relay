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
];
