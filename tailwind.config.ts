import type { Config } from "tailwindcss";

// Every colour is a design token from app/tokens.css (docs/DESIGN-SYSTEM.md).
// Components use these names only; tests/invariants/design-tokens.test.ts
// fails on a raw palette class or a hex colour in app/ or components/.
const v = (name: string) => `var(--${name})`;
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: v("ink"), 2: v("ink-2"), 3: v("ink-3") },
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        surface: v("surface"),
        subtle: v("subtle"),
        selected: v("selected"),
        accent: v("accent"),
        critical: { DEFAULT: v("critical"), soft: v("critical-soft") },
        positive: { DEFAULT: v("positive"), soft: v("positive-soft") },
        caution: { DEFAULT: v("caution"), soft: v("caution-soft") },
        agent: { DEFAULT: v("agent"), soft: v("agent-soft") },
        advisor: { DEFAULT: v("advisor"), soft: v("advisor-soft") },
        client: { DEFAULT: v("client"), soft: v("client-soft") },
      },
      borderRadius: { DEFAULT: v("radius") },
      fontFamily: { sans: [v("font")] },
    },
  },
  plugins: [],
};

export default config;
