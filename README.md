# ghost-env

**Deterministic, in-process fake HTTP APIs** for testing agents and tools. Swap real network calls for canned **GitHub**, **Stripe**, **Postgres-shaped** data, **OpenAI** / **Anthropic**-style LLM JSON, **S3**-like objects, **Slack** Web API responses—while **recording** traffic, exporting **JSON / Markdown / HAR**, running **eval scenarios**, and optionally injecting **chaos** (latency, random failures).

Same ideas in **TypeScript** (npm) and **Python** (PyPI / local install).

---

## Install

### JavaScript / TypeScript (npm)

```bash
npm install ghost-env
```

Requires **Node.js ≥ 18**. No runtime npm dependencies.

### Python

```bash
pip install ghost-env
```

From a clone (editable):

```bash
pip install -e ./python
```

Requires **Python ≥ 3.10**.

---

## Quick start

### TypeScript

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

### Python

```python
from ghost_env import GhostEnv, github, export_recording_json

env = GhostEnv(
    {"seed": 1, "providers": [github({"issues": [{"repo": "acme/api", "title": "Bug"}]})]}
)
status, text = env.fetch("https://api.github.com/repos/acme/api/issues")
assert status == 200
print(export_recording_json(env.calls()))
```

---

## Features

| Area | What you get |
|------|----------------|
| **Presets** | GitHub issues, Stripe customers, Postgres `db().query()`, OpenAI chat, Anthropic messages, S3 GET/list, Slack `auth.test` / `chat.postMessage` |
| **`GhostEnv.fetch`** | Same shape as `globalThis.fetch`; routes to the first matching provider |
| **Recording** | `calls()`, `wasCalled()`, `exportRecordingJSON` / `Markdown` / `HAR` |
| **Eval** | `runEval` + `defineScenario` for scripted agent tests |
| **Replay** | `ReplayFixture` replays canned responses in order |
| **Chaos** | `chaos: { minLatencyMs, failureRate }` on config |

---

## Documentation

Hosted on **[slaps.dev](https://slaps.dev)**:

| Doc | Contents |
|-----|----------|
| [Overview](https://slaps.dev/docs/ghost-env/) | Product summary and doc index |
| [Getting started](https://slaps.dev/docs/ghost-env/getting-started) | Providers, `fetch`, recording |
| [Use cases](https://slaps.dev/docs/ghost-env/use-cases) | Agents, execpad, eval patterns |
| [Presets](https://slaps.dev/docs/ghost-env/presets) | URLs, config shapes, matching rules |
| [API reference](https://slaps.dev/docs/ghost-env/api-reference) | `GhostEnv`, `Provider`, eval, replay, exports |
| [Testing & chaos](https://slaps.dev/docs/ghost-env/testing-and-chaos) | `runEval`, chaos options, failure recording |
| [Python notes](https://slaps.dev/docs/ghost-env/python) | Node vs Python differences |

---

## License

Apache-2.0
