import type { WorldState } from "../world/state.js";

export interface OpenAIConfig {
  responses?: Array<{
    match?: { model?: string };
    response: Record<string, unknown>;
  }>;
}

/** Canned OpenAI-style JSON for orchestration tests (no network). */
export function openaiProvider(name: string, config: OpenAIConfig) {
  let idx = 0;
  return {
    name,
    seed(_world: WorldState, _rng: () => number) {
      idx = 0;
    },
    async handle(url: URL, method: string, _body: unknown, _world: WorldState): Promise<Response | null> {
      if (!url.hostname.includes("api.openai.com")) return null;
      if (method !== "POST") return null;
      const entry = config.responses?.[idx];
      idx += 1;
      const payload =
        entry?.response ??
        ({ choices: [{ message: { role: "assistant", content: "ok" } }] } as Record<string, unknown>);
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}

export function openai(config: OpenAIConfig) {
  return openaiProvider("openai", config);
}
