# ghost-env

Deterministic **fake GitHub, Stripe, and Postgres-shaped data** for agent tests — with **recording**, **HAR/JSON export**, **eval scenarios**, **replay fixtures**, and optional **chaos** (latency / random 500s).

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
