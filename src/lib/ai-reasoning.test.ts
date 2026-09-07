import { describe, expect, it } from "vitest";
import { stripReasoningBlocks } from "@/lib/ai-reasoning";

describe("stripReasoningBlocks", () => {
  it("returns plain answers unchanged", () => {
    expect(stripReasoningBlocks("  PONG  ")).toBe("PONG");
  });

  it("removes a leading think block", () => {
    const raw = "<think>\nThe user wants a ping.\n</think>\n\nPONG";
    expect(stripReasoningBlocks(raw)).toBe("PONG");
  });

  it("removes multiple blocks and keeps the JSON payload intact", () => {
    const raw =
      '<think>a</think>{"nodes":[{"id":"n1"}]}<THINK>b</THINK>';
    expect(stripReasoningBlocks(raw)).toBe('{"nodes":[{"id":"n1"}]}');
  });

  it("drops an unterminated think block (truncated response)", () => {
    expect(stripReasoningBlocks("<think>still thinking about")).toBe("");
    expect(stripReasoningBlocks("answer <think>trailing cut")).toBe("answer");
  });
});
