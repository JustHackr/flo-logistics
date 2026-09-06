export const BASE_PATH = "/flo-logistics";

export function withBasePath(path: string) {
  if (!path) return BASE_PATH;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith(BASE_PATH)
  ) {
    return path;
  }
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
