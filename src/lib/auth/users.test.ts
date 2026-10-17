import { describe, expect, it } from "vitest";
import { parseCreateUserInput } from "./user-input";

describe("parseCreateUserInput", () => {
  const base = {
    email: "ops@flo.internal",
    name: "Ops Lead",
    password: "correct-horse",
    role: "OPS_MANAGER" as const,
  };

  it("lowercases email", () => {
    expect(parseCreateUserInput({ ...base, email: "Ops@FLO.Internal" }).email).toBe(
      "ops@flo.internal",
    );
  });

  it("rejects invalid email", () => {
    expect(() => parseCreateUserInput({ ...base, email: "not-an-email" })).toThrow(
      /email/,
    );
  });

  it("rejects short password", () => {
    expect(() => parseCreateUserInput({ ...base, password: "short" })).toThrow(/10/);
  });

  it("rejects demo1234", () => {
    expect(() => parseCreateUserInput({ ...base, password: "demo1234" })).toThrow(
      /password/,
    );
  });

  it("rejects empty name", () => {
    expect(() => parseCreateUserInput({ ...base, name: "  " })).toThrow(/Name/);
  });
});
