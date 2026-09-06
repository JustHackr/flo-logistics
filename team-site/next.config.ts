import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  basePath: "/flo-logistics",
  // Isolate from parent FLO app lockfile / src (proxy.ts, etc.)
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
