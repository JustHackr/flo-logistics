import { describe, expect, it } from "vitest";
import { negotiateLocale } from "@/lib/i18n/negotiate";

describe("negotiateLocale", () => {
  it("defaults to English when the header is absent or unsupported", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("")).toBe("en");
    expect(negotiateLocale("fr-FR, de;q=0.8")).toBe("en");
  });

  it("matches supported base and regional language tags", () => {
    expect(negotiateLocale("id")).toBe("id");
    expect(negotiateLocale("id-ID")).toBe("id");
    expect(negotiateLocale("en-GB")).toBe("en");
  });

  it("respects quality weights and original order for ties", () => {
    expect(negotiateLocale("en;q=0.4, id-ID;q=0.9")).toBe("id");
    expect(negotiateLocale("id;q=0.8, en;q=0.8")).toBe("id");
  });

  it("ignores language ranges explicitly rejected with q=0", () => {
    expect(negotiateLocale("id;q=0, en;q=0.5")).toBe("en");
    expect(negotiateLocale("id;q=0")).toBe("en");
  });

  it("uses the default locale for a wildcard", () => {
    expect(negotiateLocale("fr;q=0.9, *;q=0.5")).toBe("en");
  });
});
