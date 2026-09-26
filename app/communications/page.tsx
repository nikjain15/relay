import { Suspense } from "react";
import { Communications } from "@/components/communications";

export default function Page() {
  return (
    <Suspense>
      <Communications />
    </Suspense>
  );
}
