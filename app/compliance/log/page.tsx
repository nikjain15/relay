import { ChangeLogView } from "@/components/change-log-view";
import { APP } from "@/lib/data/policy";

export const metadata = { title: "Change log" };

export default function Page() {
  return <ChangeLogView advisorId={APP.defaultAdvisorId} />;
}
