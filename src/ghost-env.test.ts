import { describe, it, expect } from "vitest";
import {
  GhostEnv,
  github,
  stripe,
  postgres,
  openai,
  s3,
  slack,
  anthropic,
  exportRecordingJSON,
  exportRecordingMarkdown,
  exportHAR,
  ReplayFixture,
  type CallRecord,
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

  it("S3 path-style get object", async () => {
    const env = new GhostEnv({
      providers: [
        s3({
          objects: [{ bucket: "acme-docs", key: "a/b.txt", body: "hello" }],
        }),
      ],
    });
    const res = await env.fetch("https://s3.amazonaws.com/acme-docs/a/b.txt");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello");
  });

  it("S3 list bucket (list-type=2)", async () => {
    const env = new GhostEnv({
      providers: [
        s3({
          objects: [
            { bucket: "b", key: "p/x", body: "1" },
            { bucket: "b", key: "p/y", body: "2" },
          ],
        }),
      ],
    });
    const res = await env.fetch("https://s3.amazonaws.com/b?list-type=2&prefix=p/");
    expect(res.status).toBe(200);
    const j = (await res.json()) as { KeyCount: number };
    expect(j.KeyCount).toBe(2);
  });

  it("Slack chat.postMessage", async () => {
    const env = new GhostEnv({ providers: [slack()] });
    const res = await env.fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "C1", text: "hi" }),
    });
    const j = (await res.json()) as { ok: boolean; message: { text: string } };
    expect(j.ok).toBe(true);
    expect(j.message.text).toContain("hi");
  });

  it("Anthropic messages preset", async () => {
    const env = new GhostEnv({
      providers: [anthropic({ texts: ["alpha", "beta"] })],
    });
    const r1 = await env.fetch("https://api.anthropic.com/v1/messages", { method: "POST", body: "{}" });
    const r2 = await env.fetch("https://api.anthropic.com/v1/messages", { method: "POST", body: "{}" });
    const a = (await r1.json()) as { content: Array<{ text: string }> };
    const b = (await r2.json()) as { content: Array<{ text: string }> };
    expect(a.content[0].text).toBe("alpha");
    expect(b.content[0].text).toBe("beta");
  });

  it("throws when no provider matches", async () => {
    const env = new GhostEnv({ providers: [github({ issues: [] })] });
    await expect(env.fetch("https://example.com/nope")).rejects.toThrow(/no provider matched/i);
    expect(env.calls("error").length).toBeGreaterThanOrEqual(1);
  });

  it("accepts URL object as fetch input", async () => {
    const env = new GhostEnv({
      providers: [github({ issues: [{ repo: "acme/api", title: "U", body: "" }] })],
    });
    const res = await env.fetch(new URL("https://api.github.com/repos/acme/api/issues"));
    expect(res.status).toBe(200);
  });

  it("reset clears recordings and allows fresh calls", async () => {
    const env = new GhostEnv({
      providers: [github({ issues: [{ repo: "acme/api", title: "t", body: "" }] })],
    });
    await env.fetch("https://api.github.com/repos/acme/api/issues");
    expect(env.calls().length).toBeGreaterThan(0);
    env.reset();
    expect(env.calls().length).toBe(0);
    await env.fetch("https://api.github.com/repos/acme/api/issues");
    expect(env.calls().length).toBeGreaterThan(0);
  });

  it("wasCalled supports pathIncludes", async () => {
    const env = new GhostEnv({
      providers: [github({ issues: [{ repo: "acme/api", title: "t", body: "" }] })],
    });
    await env.fetch("https://api.github.com/repos/acme/api/issues");
    expect(env.wasCalled("github", { pathIncludes: "/repos/acme/api/" })).toBe(true);
    expect(env.wasCalled("github", { pathIncludes: "/repos/other/" })).toBe(false);
  });

  it("S3 returns 404 for missing object", async () => {
    const env = new GhostEnv({
      providers: [s3({ objects: [{ bucket: "b", key: "a", body: "x" }] })],
    });
    const res = await env.fetch("https://s3.amazonaws.com/b/nope");
    expect(res.status).toBe(404);
  });

  it("chaos failureRate 0 never simulates failure", async () => {
    const env = new GhostEnv({
      seed: 42,
      chaos: { failureRate: 0 },
      providers: [github({ issues: [{ repo: "a/b", title: "t", body: "" }] })],
    });
    for (let i = 0; i < 8; i++) {
      const res = await env.fetch("https://api.github.com/repos/a/b/issues");
      expect(res.status).toBe(200);
    }
  });

  it("exportRecordingMarkdown and exportHAR include call metadata", async () => {
    const env = new GhostEnv({
      providers: [github({ issues: [{ repo: "acme/api", title: "t", body: "" }] })],
    });
    await env.fetch("https://api.github.com/repos/acme/api/issues");
    const calls = env.calls();
    expect(exportRecordingMarkdown(calls)).toContain("github");
    expect(exportRecordingMarkdown(calls)).toContain("# stubfetch recording");
    const har = JSON.parse(exportHAR(calls)) as { log: { entries: unknown[] } };
    expect(har.log.entries.length).toBeGreaterThanOrEqual(1);
  });

  it("ReplayFixture returns canned responses in order and reset", async () => {
    const rows: CallRecord[] = [
      {
        id: "c1",
        provider: "p",
        method: "GET",
        url: "http://x/1",
        responseStatus: 200,
        responseBody: { n: 1 },
        durationMs: 0,
      },
      {
        id: "c2",
        provider: "p",
        method: "GET",
        url: "http://x/2",
        responseStatus: 404,
        responseBody: "gone",
        durationMs: 0,
      },
    ];
    const fx = new ReplayFixture(rows);
    const r1 = fx.nextResponse();
    expect(r1?.status).toBe(200);
    expect(r1 && (await r1.json())).toEqual({ n: 1 });
    const r2 = fx.nextResponse();
    expect(r2?.status).toBe(404);
    expect(r2 && (await r2.text())).toBe("gone");
    expect(fx.nextResponse()).toBeNull();
    fx.reset();
    const again = fx.nextResponse();
    expect(again?.status).toBe(200);
    expect(again && (await again.json())).toEqual({ n: 1 });
  });

  it("ReplayFixture.fromJSON roundtrips", () => {
    const rows: CallRecord[] = [
      {
        id: "c1",
        provider: "p",
        method: "GET",
        url: "http://x",
        responseStatus: 201,
        responseBody: { ok: true },
        durationMs: 1,
      },
    ];
    const json = JSON.stringify(rows);
    const fx = ReplayFixture.fromJSON(json);
    expect(fx.nextResponse()?.status).toBe(201);
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
