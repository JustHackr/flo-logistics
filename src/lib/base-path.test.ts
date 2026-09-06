import { afterEach, describe, expect, it } from "vitest";
import { withBasePath } from "@/lib/base-path";

describe("withBasePath", () => {
  const original = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = original;
    }
  });

  it("returns the path unchanged when basePath is empty", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "";
    expect(withBasePath("/brand/garuda.png")).toBe("/brand/garuda.png");
  });

  it("prefixes basePath for root-relative assets", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/flo-logistics/demo";
    expect(withBasePath("/brand/garuda.png")).toBe(
      "/flo-logistics/demo/brand/garuda.png"
    );
  });

  it("strips a trailing slash from basePath", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/flo-logistics/demo/";
    expect(withBasePath("/brand/blibli.png")).toBe(
      "/flo-logistics/demo/brand/blibli.png"
    );
  });
});
