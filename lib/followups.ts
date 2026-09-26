// Everything the advisor's team owes after the advice: tasks from the client
// files, ordered overdue first. Approved notes waiting for the advisor to send
// come from session state on the Follow-ups screen.
import { CLIENTS } from "@/lib/data";

export function allTasks() {
  return CLIENTS.flatMap((c) => c.tasks.map((t) => ({ ...t, clientId: c.id, clientName: c.persons.length > 1 ? `${c.name} family` : c.persons[0].name, advisorId: c.advisorId })))
    .sort((a, b) => a.dueDay - b.dueDay || a.clientName.localeCompare(b.clientName));
}

export function dueLabel(d: number): string {
  return d < 0 ? `${-d} days overdue` : d === 0 ? "due today" : `due in ${d} days`;
}
