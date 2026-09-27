// The icon set.
//
// Drawn here rather than installed, for three reasons that all matter to this
// prototype. The content security policy allows no outbound request, so an icon
// font or a CDN sprite is not an option. The design system forbids colour that
// is not a token, and `currentColor` inherits the token the text already uses.
// And an icon library brings hundreds of glyphs in a house style that is not
// this one; a small set drawn to one grid reads as a system, and a test fails on
// any glyph nothing references.
//
// The grid: 24 units, 1.5 stroke, round caps and joins, no fills, geometry on
// whole or half units. That is the restrained institutional idiom the design
// system describes (docs/DESIGN-SYSTEM.md §6). It is deliberately NOT any
// firm's proprietary icon set: no keys, no logo, no brand mark.
//
// An icon never carries meaning alone (WCAG 2.2 AA, and principle 3). It sits
// beside text, or it takes a `label` and becomes the accessible name.
import type { ReactNode } from "react";

export type IconName =
  | "email" | "calendar" | "meeting" | "voice" | "sms" | "chat" | "social"
  | "crm" | "custodian" | "archive" | "esign" | "planning"
  | "agent" | "shield" | "alert" | "block" | "check" | "clock" | "eye" | "search"
  | "home" | "list" | "people" | "document" | "chart" | "settings" | "rules" | "log"
  | "chevron" | "plus" | "filter" | "menu" | "close" | "sweep"
  | "library" | "quote" | "conflict" | "hourglass" | "trend" | "replay" | "briefing" | "question" | "flag" | "link";

const P: Record<IconName, ReactNode> = {
  // Channels. Each one reads as the thing an advisor calls it.
  email: <><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="M3.5 6.5 12 13l8.5-6.5" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  meeting: <><rect x="2.5" y="6" width="13" height="12" rx="1.5" /><path d="M15.5 11l6-3.5v9l-6-3.5z" /></>,
  voice: <path d="M6.5 3.5h3l1.5 4.5-2 1.5a10.5 10.5 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />,
  sms: <><rect x="6" y="2.5" width="12" height="19" rx="2" /><path d="M10.5 18.5h3" /></>,
  chat: <><path d="M3.5 5.5h17v11h-11l-6 4.5z" /><path d="M8 9.5h8M8 12.5h5" /></>,
  social: <><circle cx="17.5" cy="6" r="2.5" /><circle cx="6.5" cy="12" r="2.5" /><circle cx="17.5" cy="18" r="2.5" /><path d="M8.8 10.8 15.2 7.2M8.8 13.2l6.4 3.6" /></>,
  crm: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" /></>,
  custodian: <><path d="M3.5 9.5 12 4l8.5 5.5" /><path d="M5.5 9.5v10h13v-10M9.5 19.5v-6h5v6" /></>,
  archive: <><rect x="3.5" y="4" width="17" height="4.5" rx="1" /><path d="M5.5 8.5v11h13v-11M10 12.5h4" /></>,
  esign: <><path d="M3.5 17.5c3-1 4-8 6.5-8s1.5 8 4 8 2.5-3.5 6.5-3.5" /><path d="M3.5 20.5h17" /></>,
  planning: <><path d="M4 19.5V8M9.5 19.5V4M15 19.5v-8M20.5 19.5v-5" /></>,

  // The agent vocabulary. A four-point star is the one concession to convention:
  // it is what this class of product now means by "the system did this on its own".
  agent: <><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /><path d="M18 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>,
  sweep: <><path d="M4 20l6-6" /><path d="M9.5 13.5l4-4 3.5 3.5-4 4z" /><path d="M14.5 8.5 18 5l2 2-3.5 3.5" /></>,
  shield: <><path d="M12 3.5l7 2.5v6c0 4-3 7-7 8.5-4-1.5-7-4.5-7-8.5V6z" /><path d="M9 12l2 2 4-4" /></>,
  alert: <><path d="M12 4l8.5 15H3.5z" /><path d="M12 9.5v4.5M12 16.8v.2" /></>,
  block: <><circle cx="12" cy="12" r="8.5" /><path d="M6.5 6.5l11 11" /></>,
  check: <path d="M4.5 12.5l5 5 10-11" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.5l3.5 2" /></>,
  eye: <><path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.5" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5.5 5.5" /></>,

  // Navigation.
  home: <><path d="M3.5 10.5 12 4l8.5 6.5" /><path d="M6 10v9.5h12V10" /></>,
  list: <><path d="M4 6.5h16M4 12h16M4 17.5h10" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" /><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6M17.5 14.4c2.3.7 4 2.9 4 5.6" /></>,
  document: <><path d="M6 3.5h8l4.5 4.5v12.5H6z" /><path d="M13.5 3.5V8h4.5M9 12.5h6M9 16h6" /></>,
  chart: <><path d="M3.5 20.5h17" /><path d="M7 20.5v-6M12 20.5V7M17 20.5v-9" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5" /></>,
  rules: <><path d="M5 4.5h14v15H5z" /><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" /></>,
  log: <><path d="M7 3.5h13v17H7z" /><path d="M4 6.5v11" /><path d="M10.5 9h6M10.5 13h6" /></>,

  // Evidence and research. Drawn on the same grid; each says what the row is
  // about faster than a word would, and always beside the word.
  library: <><path d="M4 4.5h4v15H4zM9.5 4.5h4v15h-4z" /><path d="M15 6l4-1 3.5 13.5-4 1z" /></>,
  quote: <><path d="M5 14.5v-4a3 3 0 0 1 3-3h1" /><path d="M5 14.5h4v4H5z" /><path d="M14 14.5v-4a3 3 0 0 1 3-3h1" /><path d="M14 14.5h4v4h-4z" /></>,
  conflict: <><path d="M4 8h10.5" /><path d="M11.5 5l3 3-3 3" /><path d="M20 16H9.5" /><path d="M12.5 13l-3 3 3 3" /></>,
  hourglass: <><path d="M7 3.5h10M7 20.5h10" /><path d="M8 3.5v3l4 5.5 4-5.5v-3M8 20.5v-3l4-5.5 4 5.5v3" /></>,
  trend: <><path d="M3.5 17.5l5.5-6 4 3.5 7.5-8" /><path d="M16 7h4.5v4.5" /></>,
  replay: <><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4v4h4" /><path d="M12 8.5V12l2.5 1.5" /></>,
  briefing: <><path d="M5 4.5h14v15H5z" /><path d="M8.5 9h7M8.5 12.5h7M8.5 16h3.5" /><circle cx="17" cy="17" r="3.5" /><path d="M19.5 19.5l2 2" /></>,
  question: <><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" /><path d="M12 16.8v.2" /></>,
  flag: <><path d="M5.5 21V4" /><path d="M5.5 4.5h12l-2.5 4 2.5 4h-12" /></>,
  link: <><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" /><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" /></>,

  // Controls.
  chevron: <path d="M9 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  filter: <path d="M3.5 6h17l-6.5 7.5v6l-4-2v-4z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
};

export interface IconProps {
  name: IconName;
  /** Pixel size. 20 is the default; 16 sits inline with 13px text, 24 leads a card. */
  size?: 16 | 20 | 24 | 28;
  /** Supplying a label makes the icon the accessible name. Without one it is decorative. */
  label?: string;
  className?: string;
}

export function Icon({ name, size = 20, label, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className ?? ""}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {P[name]}
    </svg>
  );
}

/** Channel kinds map to icons in one place, so a new connector inherits one. */
export const CHANNEL_ICON: Record<string, IconName> = {
  email: "email", calendar: "calendar", meeting: "meeting", voice: "voice", sms: "sms",
  chat: "chat", social: "social", crm: "crm", custodian: "custodian", archive: "archive",
  esign: "esign", planning: "planning",
};

/** Trigger classes map to icons in one place, so a row says what kind of thing it is before its words do. */
export const CLASS_ICON: Record<string, IconName> = {
  life_event: "people", external_event: "trend", household_threshold: "alert", plan_service_event: "clock", market_view: "chart",
};

/** Document kinds, for the library and every citation row. */
export const DOC_ICON: Record<string, IconName> = {
  "research note": "document", "product one-pager": "quote", "term sheet": "rules", "model fact sheet": "chart", "procedure extract": "shield", "disclosure": "flag",
};

/** Every icon, for the design-system page and for the invariant test. */
export const ICON_NAMES = Object.keys(P) as IconName[];
