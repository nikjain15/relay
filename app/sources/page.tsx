import { SourcesView } from "@/components/sources-view";
import { APP } from "@/lib/data/policy";

export const metadata = { title: "Sources" };

export default function Page() {
  return <SourcesView advisorId={APP.defaultAdvisorId} />;
}
