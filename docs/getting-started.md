# Getting started

## Install

```bash
npm install ghost-env
```

## Minimal example

```ts
import { GhostEnv, github } from "ghost-env";

const env = new GhostEnv({
  seed: 1,
  providers: [
    github({
      issues: [{ repo: "acme/api", title: "First issue", body: "Details" }],
    }),
  ],
});

const res = await env.fetch("https://api.github.com/repos/acme/api/issues");
console.assert(res.status === 200);
const issues = await res.json();
console.log(issues[0].title);
```

## How routing works

1. You pass an ordered list of **`providers`** to `GhostEnv`.
2. Each `fetch(url, init?)` walks providers in order; the first whose **`handle`** returns a `Response` wins.
3. If none match, **`fetch` throws** (and an error-shaped record may appear in the recorder—see [API reference](api-reference.md)).

## Recording

After calls, inspect history:

```ts
env.calls(); // all CallRecord
env.calls("github"); // filter by provider name
env.wasCalled("github", { method: "GET", pathIncludes: "/issues" });
```

## Multiple presets

Combine providers for integration-style tests:

```ts
new GhostEnv({
  seed: 0,
  providers: [
    github({ issues: [] }),
    stripe({ customers: [{ email: "u@x.com" }] }),
  ],
});
```

Order matters: the first provider that handles a URL wins.

## Next steps

- [Presets](presets.md) for URL patterns and config objects
- [API reference](api-reference.md) for `db()`, `reset`, `snapshot`, exports
- [Testing & chaos](testing-and-chaos.md) for `runEval` and failure injection
