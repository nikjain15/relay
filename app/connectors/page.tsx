import { ConnectorsView } from "@/components/connectors-view";
import { APP } from "@/lib/data/policy";

export const metadata = { title: "Connected channels" };

export default function Page() {
  return <ConnectorsView advisorId={APP.defaultAdvisorId} />;
}
