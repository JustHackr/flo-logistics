export const BOOTSTRAP_ADMIN_EMAIL = "admin@flo.demo";
export const BOOTSTRAP_ADMIN_NAME = "FLO Admin";

const FORBIDDEN = new Set(["demo1234", "password", "admin", "flo"]);

export function requireBootstrapPassword(): string {
  const password = process.env.FLO_BOOTSTRAP_PASSWORD ?? "";
  if (!password) {
    throw new Error(
      "FLO_BOOTSTRAP_PASSWORD is required to seed the bootstrap admin.",
    );
  }
  if (FORBIDDEN.has(password.toLowerCase())) {
    throw new Error(
      "FLO_BOOTSTRAP_PASSWORD must not be demo1234 or another trivial password.",
    );
  }
  if (password.length < 10) {
    throw new Error("FLO_BOOTSTRAP_PASSWORD must be at least 10 characters.");
  }
  return password;
}
