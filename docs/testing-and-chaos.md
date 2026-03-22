# Testing & chaos

## Eval scenarios

`runEval` runs an array of scenarios sequentially. Each scenario creates a **fresh** `GhostEnv` from `config`, runs `run(env)`, then optional `assert(env)`.

```ts
import { runEval, defineScenario, github } from "stubfetch";

const report = await runEval([
  defineScenario({
    name: "lists issues",
    config: { providers: [github({ issues: [{ repo: "a/b", title: "t" }] })] },
    run: async (env) => {
      await env.fetch("https://api.github.com/repos/a/b/issues");
    },
    assert: (env) => {
      if (!env.wasCalled("github", { method: "GET" })) throw new Error("expected GET");
    },
  }),
]);

console.log(report.passRate, report.results);
```

Failures capture **`error`** strings per scenario; **`passRate`** is `ok / count`.

## Chaos

```ts
new GhostEnv({
  seed: 99,
  chaos: {
    minLatencyMs: 50, // await before handler runs
    failureRate: 0.1, // 10% throws before provider
  },
  providers: [/* … */],
});
```

- **`failureRate`** uses the seeded RNG; **`0`** disables simulated failures (falsy check).
- Failures throw **`stubfetch chaos: simulated failure`** (after optional latency).

## Recording exports

- **`exportRecordingJSON`** — pretty JSON for fixtures or LLM context.
- **`exportRecordingMarkdown`** — human-readable sections per call.
- **`exportHAR`** — HAR-like JSON (includes extension fields for provider id).

Use these after `fetch` calls with `env.calls()`.

## Python

`run_eval` / `define_scenario` mirror the npm API; scenarios may use a `check` callable instead of `assert` (see `stubfetch.eval_runner`).
