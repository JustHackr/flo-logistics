import { isRole, type Role } from "@/lib/auth/roles";

export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  role: Role;
};

export function parseCreateUserInput(raw: {
  email: string;
  name: string;
  password: string;
  role: string;
}): CreateUserInput {
  const email = raw.email.trim().toLowerCase();
  const name = raw.name.trim();
  const password = raw.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email is required.");
  }
  if (name.length < 1 || name.length > 80) {
    throw new Error("Name is required (max 80 characters).");
  }
  if (password.toLowerCase() === "demo1234") {
    throw new Error("Choose a stronger password.");
  }
  if (password.length < 10) {
    throw new Error("Password must be at least 10 characters.");
  }
  if (!isRole(raw.role)) {
    throw new Error("Invalid role.");
  }
  return { email, name, password, role: raw.role };
}
