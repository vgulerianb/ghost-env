# ghost-env

**Deterministic, in-process fake HTTP APIs** for testing agents and tools. Swap real network calls for canned **GitHub**, **Stripe**, **Postgres-shaped** data, **OpenAI** / **Anthropic**-style LLM JSON, **S3**-like objects, **Slack** Web API responses—while **recording** traffic, exporting **JSON / Markdown / HAR**, running **eval scenarios**, and optionally injecting **chaos** (latency, random failures).

## Install

```bash
npm install ghost-env
```

Requires **Node.js ≥ 18**. No runtime npm dependencies.

## Quick start

```ts
import { GhostEnv, github, exportRecordingJSON } from "ghost-env";

const env = new GhostEnv({
  seed: 42,
  providers: [github({ issues: [{ repo: "acme/api", title: "Bug" }] })],
});

const res = await env.fetch("https://api.github.com/repos/acme/api/issues");
console.log(await res.json());
console.log(exportRecordingJSON(env.calls()));
```

## Features

| Area | What you get |
|------|----------------|
| **Presets** | GitHub issues, Stripe customers, Postgres `db().query()`, OpenAI chat, Anthropic messages, S3 GET/list, Slack `auth.test` / `chat.postMessage` |
| **`GhostEnv.fetch`** | Same shape as `globalThis.fetch`; routes to the first matching provider |
| **Recording** | `calls()`, `wasCalled()`, `exportRecordingJSON` / `Markdown` / `HAR` |
| **Eval** | `runEval` + `defineScenario` for scripted agent tests |
| **Replay** | `ReplayFixture` replays canned responses in order |
| **Chaos** | `chaos: { minLatencyMs, failureRate }` on config |

## Documentation

| Doc | Contents |
|-----|----------|
| [Getting started](docs/getting-started.md) | Providers, `fetch`, recording |
| [Presets](docs/presets.md) | URLs, config shapes, matching rules |
| [API reference](docs/api-reference.md) | `GhostEnv`, `Provider`, eval, replay, exports |
| [Testing & chaos](docs/testing-and-chaos.md) | `runEval`, chaos options, failure recording |

## Python

`pip install ./python` — API mirrors the npm package where applicable. See [`python/README.md`](python/README.md) and [docs/python.md](docs/python.md).

## License

Apache-2.0
