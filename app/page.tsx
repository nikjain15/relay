import { Overview } from "@/components/overview";
import { APP } from "@/lib/data/policy";

export default function Page() {
  return <Overview advisorId={APP.defaultAdvisorId} />;
}
