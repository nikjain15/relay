"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProfilesView } from "@/components/profiles-view";

// Reads the query string in the browser, so the page exports as static HTML (GitHub Pages, R-22).
function WithParams() {
  const sp = useSearchParams();
  return <ProfilesView advisor={sp.get("advisor") ?? undefined} client={sp.get("client") ?? undefined} />;
}

export default function Profiles() {
  return (
    <Suspense>
      <WithParams />
    </Suspense>
  );
}
