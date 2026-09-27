import { AgentsView } from "@/components/agents-view";
import { APP } from "@/lib/data/policy";

export const metadata = { title: "Agents" };

export default function Page() {
  return <AgentsView advisorId={APP.defaultAdvisorId} />;
}
