import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import id from "@/messages/id.json";

function collectKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe("message dictionary parity", () => {
  it("has an identical deep key tree for English and Indonesian", () => {
    expect(collectKeys(id).sort()).toEqual(collectKeys(en).sort());
  });

  it("contains non-empty string values in both dictionaries", () => {
    for (const dictionary of [en, id]) {
      for (const key of collectKeys(dictionary)) {
        const value = key
          .split(".")
          .reduce<unknown>(
            (current, segment) =>
              typeof current === "object" && current !== null
                ? (current as Record<string, unknown>)[segment]
                : undefined,
            dictionary
          );

        expect(value, key).toEqual(expect.any(String));
        expect((value as string).trim().length, key).toBeGreaterThan(0);
      }
    }
  });
});
