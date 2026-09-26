import { SupervisionView } from "@/components/supervision-view";
import { APP } from "@/lib/data/policy";

export const metadata = { title: "Supervision console" };

export default function Page() {
  return <SupervisionView advisorId={APP.defaultAdvisorId} />;
}
