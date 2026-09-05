import { describe, expect, it } from "vitest";
import { t, type TranslationDictionary } from "@/lib/i18n/t";

const dictionary: TranslationDictionary = {
  nav: {
    home: "Home",
  },
  greeting: "Hello, {name}!",
  count: "{count} orders for {name}",
};

describe("t", () => {
  it("resolves dotted keys", () => {
    expect(t(dictionary, "nav.home")).toBe("Home");
  });

  it("interpolates string and number parameters", () => {
    expect(t(dictionary, "greeting", { name: "Rani" })).toBe("Hello, Rani!");
    expect(t(dictionary, "count", { count: 3, name: "Budi" })).toBe(
      "3 orders for Budi"
    );
  });

  it("leaves unmatched placeholders intact", () => {
    expect(t(dictionary, "count", { count: 2 })).toBe("2 orders for {name}");
  });

  it("returns the key when no translation exists", () => {
    expect(t(dictionary, "nav.missing")).toBe("nav.missing");
  });

  it("walks a fallback dictionary when supplied", () => {
    const fallback: TranslationDictionary = {
      nav: {
        reports: "Reports",
      },
    };

    expect(t(dictionary, "nav.reports", undefined, fallback)).toBe("Reports");
  });
});
