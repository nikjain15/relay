import { ComplianceView } from "@/components/compliance-view";
import { APP } from "@/lib/data/policy";

export const metadata = { title: "Rules and agents" };

export default function Page() {
  return <ComplianceView advisorId={APP.defaultAdvisorId} />;
}
