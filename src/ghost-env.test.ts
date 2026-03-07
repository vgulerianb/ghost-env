import { describe, it, expect } from "vitest";
import {
  GhostEnv,
  github,
  stripe,
  postgres,
  openai,
  exportRecordingJSON,
  runEval,
  defineScenario,
} from "./index.js";

describe("GhostEnv", () => {
  it("intercepts GitHub issues GET", async () => {
    const env = new GhostEnv({
      seed: 1,
      providers: [
        github({
          issues: [{ repo: "acme/api", title: "Bug", body: "x" }],
        }),
      ],
    });
    const res = await env.fetch("https://api.github.com/repos/acme/api/issues");
    expect(res.status).toBe(200);
    const data = (await res.json()) as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect((data[0] as { title: string }).title).toBe("Bug");
    expect(env.wasCalled("github", { method: "GET" })).toBe(true);
  });

  it("records POST issue", async () => {
    const env = new GhostEnv({
      providers: [github({ issues: [] })],
    });
    const res = await env.fetch("https://api.github.com/repos/acme/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New", body: "hi" }),
    });
    expect(res.status).toBe(201);
    expect(env.calls("github").length).toBeGreaterThanOrEqual(1);
  });

  it("stripe lists customers", async () => {
    const env = new GhostEnv({
      providers: [stripe({ customers: [{ email: "a@b.com" }] })],
    });
    const res = await env.fetch("https://api.stripe.com/v1/customers");
    const j = (await res.json()) as { data: unknown[] };
    expect(j.data.length).toBe(1);
  });

  it("postgres db query", async () => {
    const env = new GhostEnv({
      providers: [
        postgres({
          tables: {
            users: [{ id: 1, role: "admin", name: "A" }],
          },
        }),
      ],
    });
    const { rows } = await env.db().query("SELECT * FROM users", []);
    expect(rows.length).toBe(1);
  });

  it("exportRecordingJSON", async () => {
    const env = new GhostEnv({ providers: [github({ issues: [] })] });
    await env.fetch("https://api.github.com/repos/acme/api/issues");
    const json = exportRecordingJSON(env.calls());
    expect(json).toContain("github");
  });

  it("openai preset returns canned JSON", async () => {
    const env = new GhostEnv({
      providers: [
        openai({
          responses: [
            {
              response: {
                choices: [{ message: { role: "assistant", content: "hello" } }],
              },
            },
          ],
        }),
      ],
    });
    const res = await env.fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      body: "{}",
    });
    const j = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    expect(j.choices[0].message.content).toBe("hello");
    expect(env.wasCalled("openai")).toBe(true);
  });

  it("chaos can fail requests", async () => {
    const env = new GhostEnv({
      seed: 99,
      chaos: { failureRate: 1 },
      providers: [github({ issues: [{ repo: "a/b", title: "t" }] })],
    });
    await expect(env.fetch("https://api.github.com/repos/a/b/issues")).rejects.toThrow();
  });

  it("runEval scenarios", async () => {
    const report = await runEval([
      defineScenario({
        name: "ok",
        config: { providers: [github({ issues: [{ repo: "acme/api", title: "t" }] })] },
        run: async (e) => {
          await e.fetch("https://api.github.com/repos/acme/api/issues");
        },
        assert: (e) => {
          if (!e.wasCalled("github", { method: "GET" })) throw new Error("no call");
        },
      }),
    ]);
    expect(report.passRate).toBe(1);
  });
});
