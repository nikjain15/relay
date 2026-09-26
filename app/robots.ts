import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Public on GitHub Pages since R-22, but still not for search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
