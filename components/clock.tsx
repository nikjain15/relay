"use client";

// The day and time on screen, from the browser's clock. The prototype's data
// is relative (day 0, day -30), so nothing here moves a record; only the words
// at the top of a page change. The server and the first paint show the label
// from data/app.json, so hydration never disagrees; the live clock takes over on
// mount and refreshes each minute.
import { useEffect, useState } from "react";
import { APP } from "@/lib/data/policy";

export interface Today {
  /** "Tuesday". */
  weekday: string;
  /** "Tuesday, 29 September 2026". */
  date: string;
  /** "09:17". */
  time: string;
  /** True once the browser's clock is in use, false on the server and the first paint. */
  live: boolean;
}

export function formatToday(d: Date): Today {
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "long" }),
    date: d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    live: true,
  };
}

const FALLBACK: Today = { weekday: APP.todayLabel, date: APP.todayLabel, time: "", live: false };

/** Today's weekday, date and time, refreshed every minute. */
export function useToday(): Today {
  const [today, setToday] = useState<Today>(FALLBACK);
  useEffect(() => {
    const tick = () => setToday(formatToday(new Date()));
    tick();
    // Align the first refresh to the next whole minute, then every minute.
    let interval: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => { tick(); interval = setInterval(tick, 60_000); }, 60_000 - (Date.now() % 60_000));
    return () => { clearTimeout(first); if (interval) clearInterval(interval); };
  }, []);
  return today;
}

/** The date and time in the header, so every screen says which day it is. */
export function Clock() {
  const t = useToday();
  return (
    <time dateTime={t.live ? new Date().toISOString().slice(0, 10) : undefined} className="hidden whitespace-nowrap text-meta leading-4 text-ink-2 lg:inline" aria-live="off">
      {t.live ? `${t.date}, ${t.time}` : t.weekday}
    </time>
  );
}
