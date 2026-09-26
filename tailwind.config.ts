import type { Config } from "tailwindcss";

// Institutional neutral (D-54). The accent is one CSS variable, set in
// app/globals.css, so it can be changed locally without touching components.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
      },
    },
  },
  plugins: [],
};

export default config;
