import { Suspense } from "react";
import { Communications } from "@/components/communications";

export const metadata = { title: "Client notes" };

export default function Page() {
  return (
    <Suspense>
      <Communications />
    </Suspense>
  );
}
