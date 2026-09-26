import type { MetadataRoute } from "next";

// A private interview artifact: nothing here may be indexed (job-search D-57).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
