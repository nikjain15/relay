import { classify } from "@/lib/recipients/count";

// Placeholder entry. The surfaces in docs/PRD-relay.md §4.1 are not built yet;
// this page exists so the app compiles and the invariant has something to guard.
export default function Home() {
  const sample = classify(25);
  return (
    <main className="mx-auto max-w-3xl p-8 text-sm">
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        Illustrative prototype. All data synthetic.
      </p>
      <h1 className="mt-2 text-xl font-semibold">Relay</h1>
      <p className="mt-4">
        Advisor advice-to-action layer. Not built yet: see <code>docs/PRD-relay.md</code>.
      </p>
      <p className="mt-4">
        Recipient counter self-check: 25 retail investors in 30 days is{" "}
        <span className="font-medium text-accent">{sample}</span>.
      </p>
    </main>
  );
}
