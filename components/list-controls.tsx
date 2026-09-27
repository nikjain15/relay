"use client";

// One control for every list an advisor scans: search, filter, sort.
//
// Households, Sources, Agents and Supervision all answer the same three
// questions (find one, narrow to what matters, put the worst first), so they
// share one control and one behaviour. Each filter shows its count before it is
// pressed, so a filter never leads to an empty screen by surprise; the line
// under it says how many are shown and gives the way back.
import { useState } from "react";
import { Icon } from "@/components/icons";
import { inputSmall } from "@/components/ui";

export interface ListFilter<T> { id: string; label: string; test: (x: T) => boolean }
export interface ListSort<T> { id: string; label: string; compare: (a: T, b: T) => number }

/** Case-insensitive match of every word in the query against the item's text. */
export function matches(text: string, query: string): boolean {
  const hay = text.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

/** State and result for a list: pass the items and how to read them; render <ListControls {...list} />. */
export function useList<T>(items: T[], opts: { text: (x: T) => string; filters?: ListFilter<T>[]; sorts?: ListSort<T>[]; initialFilter?: string; initialSort?: string }) {
  const filters = opts.filters ?? [];
  const sorts = opts.sorts ?? [];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(opts.initialFilter ?? "all");
  const [sort, setSort] = useState(opts.initialSort ?? sorts[0]?.id ?? "");
  // Recomputed each render: a list here is tens of rows, and the callers pass
  // fresh filter and sort objects, so memoising would never hit.
  const searched = query.trim() ? items.filter((x) => matches(opts.text(x), query)) : items;
  const counts = Object.fromEntries(filters.map((f) => [f.id, searched.filter(f.test).length]));
  const active = filters.find((x) => x.id === filter);
  const narrowed = active ? searched.filter(active.test) : searched;
  const order = sorts.find((x) => x.id === sort);
  const shown = order ? [...narrowed].sort(order.compare) : narrowed;
  const reset = () => { setQuery(""); setFilter("all"); };
  return { shown, total: items.length, query, setQuery, filter, setFilter, sort, setSort, filters, sorts, counts, reset, searchedCount: searched.length };
}

export function ListControls<T>({ label, placeholder, noun, list }: {
  /** What the list is, for screen readers: "Households". */
  label: string;
  placeholder: string;
  /** Singular and plural, for the count line: ["household", "households"]. */
  noun: [string, string];
  list: ReturnType<typeof useList<T>>;
}) {
  const { query, setQuery, filter, setFilter, sort, setSort, filters, sorts, counts, shown, total, reset, searchedCount } = list;
  const narrowed = query.trim() !== "" || filter !== "all";
  return (
    <div className="mb-4 space-y-2" role="search" aria-label={`Search and filter ${label.toLowerCase()}`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Search {label.toLowerCase()}</span>
          <Icon name="search" size={16} className="pointer-events-none absolute left-2 top-2 text-ink-3" />
          <input type="search" className={`${inputSmall} w-full pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
        </label>
        {sorts.length > 1 && (
          <label className="flex items-center gap-1.5 text-meta text-ink-2">
            Sort
            <select className={inputSmall} value={sort} onChange={(e) => setSort(e.target.value)} aria-label={`Sort ${label.toLowerCase()}`}>
              {sorts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        )}
      </div>
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Filter ${label.toLowerCase()}`}>
          <FilterChip on={filter === "all"} onClick={() => setFilter("all")} label="All" count={searchedCount} />
          {filters.map((f) => <FilterChip key={f.id} on={filter === f.id} onClick={() => setFilter(filter === f.id ? "all" : f.id)} label={f.label} count={counts[f.id] ?? 0} />)}
        </div>
      )}
      <p className="text-meta text-ink-3" aria-live="polite">
        {narrowed ? <>{shown.length} of {total} {total === 1 ? noun[0] : noun[1]} shown. <button type="button" className="underline" onClick={reset}>Show all</button></> : <>{total} {total === 1 ? noun[0] : noun[1]}.</>}
      </p>
    </div>
  );
}

function FilterChip({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} disabled={!on && count === 0}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded border px-2.5 text-meta disabled:opacity-40 ${on ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink-2 hover:bg-subtle"}`}>
      {label}<span className={`tabular-nums ${on ? "" : "text-ink-3"}`}>{count}</span>
    </button>
  );
}
