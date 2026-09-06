/**
 * Prefix a root-relative public path with Next.js `basePath` when deployed
 * under a subpath (e.g. `/flo-logistics/demo`).
 *
 * `next/link` applies basePath automatically; `next/image` and raw `<a href>`
 * for static files do not — see Next.js basePath docs.
 */
export function withBasePath(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
