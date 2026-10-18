import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Subpath is /flo-logistics on the VPS (default). Set NEXT_BASE_PATH=/ to serve from the root, e.g. on Vercel.
const rawBasePath = process.env.NEXT_BASE_PATH?.trim() || "/flo-logistics";
const basePath = rawBasePath === "/" ? "" : rawBasePath;

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Isolate from parent FLO app lockfile / src (proxy.ts, etc.)
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
