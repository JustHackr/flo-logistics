import { describe, expect, it } from "vitest";
import {
  aiProviderSettingsSchema,
  aiProviderUpsertSchema,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  hostFromBaseUrl,
  isAiProviderPublicConfigured,
  isLocalBaseUrl,
  normalizeAiBaseUrl,
  resolveOllamaDefaults,
  resolveProviderPriority,
} from "@/lib/ai-settings";

describe("resolveOllamaDefaults", () => {
  it("fills localhost /v1 and llama3.2 when empty", () => {
    expect(resolveOllamaDefaults({})).toEqual({
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
      model: DEFAULT_OLLAMA_MODEL,
    });
  });

  it("preserves custom base URL and strips trailing slash", () => {
    expect(
      resolveOllamaDefaults({
        baseUrl: "http://10.0.0.5:11434/v1/",
        model: "mistral",
      })
    ).toEqual({
      baseUrl: "http://10.0.0.5:11434/v1",
      model: "mistral",
    });
  });
});

describe("aiProviderUpsertSchema", () => {
  it("accepts sovereign", () => {
    expect(aiProviderUpsertSchema.parse({ mode: "sovereign" })).toEqual({
      mode: "sovereign",
    });
  });

  it("accepts ollama with model only", () => {
    const parsed = aiProviderUpsertSchema.parse({
      mode: "ollama",
      model: "llama3.2",
    });
    expect(parsed.mode).toBe("ollama");
    if (parsed.mode === "ollama") {
      expect(parsed.model).toBe("llama3.2");
    }
  });

  it("requires api fields for openai_compatible", () => {
    expect(() =>
      aiProviderUpsertSchema.parse({
        mode: "openai_compatible",
        baseUrl: "not-a-url",
        model: "gpt",
      })
    ).toThrow();

    const ok = aiProviderUpsertSchema.parse({
      mode: "openai_compatible",
      baseUrl: "https://api.example.com/v1",
      model: "gpt-4o-mini",
      apiKey: "sk-test",
    });
    expect(ok.mode).toBe("openai_compatible");
    if (ok.mode === "openai_compatible") {
      expect(ok.apiKey).toBe("sk-test");
    }
  });
});

describe("aiProviderSettingsSchema", () => {
  it("allows empty apiKey for Ollama-style calls", () => {
    const parsed = aiProviderSettingsSchema.parse({
      apiKey: "",
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
      model: DEFAULT_OLLAMA_MODEL,
      mode: "ollama",
    });
    expect(parsed.apiKey).toBe("");
  });
});

describe("resolveProviderPriority", () => {
  it("uses SQLite ollama over env", () => {
    const resolved = resolveProviderPriority({
      db: {
        mode: "ollama",
        apiKey: "",
        baseUrl: "",
        model: "",
      },
      env: {
        allowExternal: true,
        apiKey: "sk-env",
        baseUrl: "https://cloud.example/v1",
        model: "env-model",
      },
    });
    expect(resolved.source).toBe("sqlite");
    expect(resolved.mode).toBe("ollama");
    expect(resolved.settings?.baseUrl).toBe(DEFAULT_OLLAMA_BASE_URL);
    expect(resolved.settings?.model).toBe(DEFAULT_OLLAMA_MODEL);
  });

  it("sovereign SQLite blocks env outbound", () => {
    const resolved = resolveProviderPriority({
      db: {
        mode: "sovereign",
        apiKey: "",
        baseUrl: "",
        model: "",
      },
      env: {
        allowExternal: true,
        apiKey: "sk-env",
        baseUrl: "https://cloud.example/v1",
        model: "env-model",
      },
    });
    expect(resolved.mode).toBe("sovereign");
    expect(resolved.settings).toBeNull();
    expect(resolved.source).toBe("sqlite");
  });

  it("falls back to env when no DB row", () => {
    const resolved = resolveProviderPriority({
      db: null,
      env: {
        allowExternal: true,
        apiKey: "sk-env",
        baseUrl: "https://cloud.example/v1/",
        model: "gpt-test",
      },
    });
    expect(resolved.source).toBe("env");
    expect(resolved.mode).toBe("openai_compatible");
    expect(resolved.settings?.baseUrl).toBe("https://cloud.example/v1");
    expect(resolved.settings?.model).toBe("gpt-test");
  });

  it("defaults to sovereign without DB or env", () => {
    const resolved = resolveProviderPriority({
      db: null,
      env: { allowExternal: false },
    });
    expect(resolved).toEqual({
      mode: "sovereign",
      settings: null,
      source: "default",
    });
  });

  it("ignores incomplete openai_compatible DB and uses env", () => {
    const resolved = resolveProviderPriority({
      db: {
        mode: "openai_compatible",
        apiKey: "",
        baseUrl: "https://cloud.example/v1",
        model: "gpt",
      },
      env: {
        allowExternal: true,
        apiKey: "sk-env",
        baseUrl: "https://cloud.example/v1",
        model: "env-model",
      },
    });
    expect(resolved.source).toBe("env");
    expect(resolved.settings?.apiKey).toBe("sk-env");
  });
});

describe("helpers", () => {
  it("normalizes trailing slashes", () => {
    expect(normalizeAiBaseUrl("http://127.0.0.1:11434/v1///")).toBe(
      "http://127.0.0.1:11434/v1"
    );
  });

  it("extracts host with port", () => {
    expect(hostFromBaseUrl(DEFAULT_OLLAMA_BASE_URL)).toBe("127.0.0.1:11434");
  });

  it("detects local URLs", () => {
    expect(isLocalBaseUrl(DEFAULT_OLLAMA_BASE_URL)).toBe(true);
    expect(isLocalBaseUrl("https://api.openai.com/v1")).toBe(false);
  });

  it("marks ollama/openai as publicly configured", () => {
    expect(
      isAiProviderPublicConfigured({
        configured: true,
        model: "llama3.2",
        mode: "ollama",
        baseUrlHost: "127.0.0.1:11434",
        baseUrl: DEFAULT_OLLAMA_BASE_URL,
        hasApiKey: false,
        source: "sqlite",
      })
    ).toBe(true);
    expect(
      isAiProviderPublicConfigured({
        configured: false,
        model: "local",
        mode: "sovereign",
        baseUrlHost: null,
        baseUrl: null,
        hasApiKey: false,
        source: "default",
      })
    ).toBe(false);
  });
});
