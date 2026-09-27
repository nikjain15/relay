"use client";

// Contact history and team notes as the session holds them. The household page
// is rendered from the shipped file, but a note filed this session (a dossier
// note, say) is in the session book, and the briefing already shows it; this
// makes the household page show the same record.
import { useRelay } from "@/components/state";

export function HouseholdNotes({ clientId }: { clientId: string }) {
  const { book } = useRelay();
  const c = book.clients.find((x) => x.id === clientId);
  if (!c) return null;
  const ago = (d: number) => (d === 0 ? "today" : `${-d} days ago`);
  return (
    <ul className="space-y-1">
      {c.contactHistory.map((e, i) => (
        <li key={i}>
          <strong>{e.channel}</strong>, {ago(e.day)}: {e.summary}
        </li>
      ))}
      {c.notes.map((n, i) => (
        <li key={`n${i}`} className="rounded bg-caution-soft px-2 py-1 text-caution">
          <strong>{n.from}</strong>, {ago(n.day)}: {n.text}
        </li>
      ))}
    </ul>
  );
}
