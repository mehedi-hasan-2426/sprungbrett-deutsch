import type { NextConfig } from "next";
import security from "./vercel.json";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: { unoptimized: true },
  outputFileTracingIncludes: { "/*": ["./content/generated/course.json"] },
  headers: async () => security.headers,
};

export default config;
