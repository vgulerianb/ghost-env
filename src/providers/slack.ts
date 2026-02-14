import type { WorldState } from "../world/state.js";

export interface SlackConfig {
  /** Default bot user id for postMessage responses */
  botUserId?: string;
}

/** Subset of Slack Web API responses for deterministic tests. */
export function slackProvider(name: string, config: SlackConfig) {
  const bot = config.botUserId ?? "UFAKEBOT";
  return {
    name,
    seed(_world: WorldState, _rng: () => number) {
      /* optional future: seed channels */
    },
    async handle(url: URL, method: string, body: unknown, _world: WorldState): Promise<Response | null> {
      if (!url.hostname.endsWith("slack.com")) return null;
      const path = url.pathname.replace(/\/+$/, "") || "/";

      if (path === "/api/auth.test" && (method === "GET" || method === "POST")) {
        const payload = {
          ok: true,
          url: "https://acme.slack.com/",
          team: "acme",
          user: bot,
          team_id: "T0001",
          user_id: bot,
        };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (path === "/api/chat.postMessage" && method === "POST") {
        let text = "";
        try {
          const b = typeof body === "string" ? JSON.parse(body) : (body as Record<string, unknown>);
          text = String(b?.channel ?? "") + ":" + String(b?.text ?? "");
        } catch {
          text = "";
        }
        const ts = `${Date.now() / 1000}.000100`;
        const payload = {
          ok: true,
          channel: "C0001",
          ts,
          message: {
            user: bot,
            type: "message",
            text,
          },
        };
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return null;
    },
  };
}

export function slack(config: SlackConfig = {}) {
  return slackProvider("slack", config);
}
