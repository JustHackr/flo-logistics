import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH?.trim() || undefined;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  outputFileTracingIncludes: {
    "/*": ["./dev.db", "./prisma/dev.db"],
  },
};

export default nextConfig;
