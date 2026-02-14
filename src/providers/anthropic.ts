import type { WorldState } from "../world/state.js";

export interface AnthropicConfig {
  /** Canned assistant text per request (cycles if shorter than calls). */
  texts?: string[];
  model?: string;
}

/** Minimal Anthropic Messages API shape for offline agent tests. */
export function anthropicProvider(name: string, config: AnthropicConfig) {
  let idx = 0;
  const texts = config.texts?.length ? config.texts : ["Hello from fake Claude"];
  return {
    name,
    seed(_world: WorldState, _rng: () => number) {
      idx = 0;
    },
    async handle(url: URL, method: string, _body: unknown, _world: WorldState): Promise<Response | null> {
      if (!url.hostname.includes("api.anthropic.com")) return null;
      if (method !== "POST") return null;
      if (!url.pathname.includes("/v1/messages")) return null;
      const text = texts[idx % texts.length] ?? "ok";
      idx += 1;
      const payload = {
        id: `msg_${idx}`,
        type: "message",
        role: "assistant",
        model: config.model ?? "claude-3-5-sonnet-20241022",
        content: [{ type: "text", text }],
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 1 },
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}

export function anthropic(config: AnthropicConfig = {}) {
  return anthropicProvider("anthropic", config);
}
