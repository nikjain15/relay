import type { NextConfig } from "next";

// Two runtime guards behind the source scans (R-21). The browser may only talk
// to this origin: connect-src and form-action 'self' block any request or form
// post to another host, so no page can become an outbound path even if code
// slips past tests/invariants. And every response says noindex: this is a
// private interview artifact, never a public indexed page (job-search D-57).
const nextConfig: NextConfig = {
  reactStrictMode: true,
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
