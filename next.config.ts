import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH?.trim() || undefined;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // Inlined at build time so client components can prefix static assets.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath || "",
  },
  // Allow curl/browser tools on a different loopback origin during local dev.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  outputFileTracingIncludes: {
    "/*": ["./dev.db", "./prisma/dev.db"],
  },
};

export default nextConfig;
