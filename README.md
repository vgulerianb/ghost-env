# ghost-env

Deterministic **fake APIs** for agent tests — built-in presets for **GitHub**, **Stripe**, **Postgres-shaped** queries, **OpenAI**-style chat, **Anthropic** messages, **S3**-shaped object GET/list, and **Slack** Web API — plus **recording**, **HAR/JSON export**, **eval**, **replay**, and optional **chaos** (latency / random failures).

```bash
npm install ghost-env
```

```ts
import { GhostEnv, github, exportRecordingJSON, runEval, defineScenario } from "ghost-env";

const env = new GhostEnv({
  seed: 42,
  providers: [github({ issues: [{ repo: "acme/api", title: "Bug" }] })],
});

const res = await env.fetch("https://api.github.com/repos/acme/api/issues");
console.log(await res.json());
console.log(exportRecordingJSON(env.calls()));
```

Python: `pip install ./python` (see `python/README.md`).


License: Apache-2.0
