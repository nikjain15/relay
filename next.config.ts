import type { NextConfig } from "next";

// Two runtime guards behind the source scans (R-21). The browser may only talk
// to this origin: connect-src and form-action 'self' block any request or form
// post to another host, so no page can become an outbound path even if code
// slips past tests/invariants. Every response also says noindex.
//
// RELAY_EXPORT=1 builds the static site for GitHub Pages (R-22). Pages cannot
// set response headers, so the same connect-src policy also ships as a <meta>
// tag in app/layout.tsx, and noindex as the robots meta and robots.txt.
const EXPORT = process.env.RELAY_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(EXPORT ? { output: "export" as const, basePath: process.env.RELAY_BASE_PATH ?? "/relay", trailingSlash: true } : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
