import { afterEach, describe, expect, it } from "vitest";
import { BOOTSTRAP_ADMIN_EMAIL, requireBootstrapPassword } from "./bootstrap";

describe("bootstrap admin", () => {
  afterEach(() => {
    delete process.env.FLO_BOOTSTRAP_PASSWORD;
  });

  it("uses the approved master email", () => {
    expect(BOOTSTRAP_ADMIN_EMAIL).toBe("admin@flo.demo");
  });

  it("requires FLO_BOOTSTRAP_PASSWORD", () => {
    delete process.env.FLO_BOOTSTRAP_PASSWORD;
    expect(() => requireBootstrapPassword()).toThrow(/FLO_BOOTSTRAP_PASSWORD/);
  });

  it("rejects the old demo password", () => {
    process.env.FLO_BOOTSTRAP_PASSWORD = "demo1234";
    expect(() => requireBootstrapPassword()).toThrow(/demo1234/);
  });

  it("rejects short passwords", () => {
    process.env.FLO_BOOTSTRAP_PASSWORD = "short";
    expect(() => requireBootstrapPassword()).toThrow(/at least 10/);
  });

  it("accepts a strong password", () => {
    process.env.FLO_BOOTSTRAP_PASSWORD = "correct-horse";
    expect(requireBootstrapPassword()).toBe("correct-horse");
  });
});
