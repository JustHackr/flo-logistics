/**
 * Reasoning models (MiniMax-M*, DeepSeek-R1, Qwen3, …) often prepend their
 * chain-of-thought as a `<think>…</think>` block in `message.content`. Strip
 * it so callers only see the final answer.
 *
 * An unterminated block (response truncated mid-thought) yields an empty
 * string, which callers report as an empty response.
 */
export function stripReasoningBlocks(text: string): string {
  const closed = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const open = closed.search(/<think>/i);
  return (open >= 0 ? closed.slice(0, open) : closed).trim();
}
