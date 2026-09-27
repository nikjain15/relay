// The page's name comes from the navigation; the screen itself is ./view.tsx.
import Triage from "./view";

export const metadata = { title: "Today's list" };

export default function Page() {
  return <Triage />;
}
