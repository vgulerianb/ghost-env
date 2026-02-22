# API reference

## `GhostEnv`

### Constructor

`new GhostEnv(config: GhostEnvConfig)`

| Field | Type | Description |
|-------|------|-------------|
| `seed` | `number` | PRNG seed (default `1`) for providers that use `rng` |
| `providers` | `Provider[]` | Ordered list; first match wins |
| `chaos` | `ChaosOptions` | Optional latency / simulated failures |

### Methods

| Method | Description |
|--------|-------------|
| `fetch(input, init?)` | Like `fetch`; `input` may be `string` or `URL` |
| `calls(provider?)` | Recorded `CallRecord[]`, optionally filtered by provider name |
| `wasCalled(provider, partial?)` | `method`, `url`, or `pathIncludes` partial match |
| `db(name?)` | Minimal SQL facade over `pg:*` entities (default name ignored for routing; same world) |
| `reset()` | Clear recorder; restore world from snapshot or empty + re-seed |
| `snapshot()` | Save world JSON string |
| `restore(data)` | Load world from string |

### Recording shape

Each **`CallRecord`**: `id`, `provider`, `method`, `url`, `requestBody?`, `responseStatus`, `responseBody?`, `durationMs`.

On thrown errors before a provider responds, the recorder may store **`provider: "error"`**.

## Exports

### Core

- `GhostEnv`, `GhostEnvConfig`, `Provider`
- `WorldState`, `mulberry32` (advanced / tests)

### Recording

- `Recorder`, `CallRecord`
- `exportRecordingJSON`, `exportRecordingMarkdown`, `exportHAR`

### Presets

- Named helpers: `github`, `stripe`, `postgres`, `openai`, `s3`, `slack`, `anthropic`
- Lower-level: `githubProvider`, `stripeProvider`, … (custom `name` / composition)

### Eval & replay

- `runEval`, `defineScenario`, `Scenario`, `EvalReport`
- `ReplayFixture` — `fromJSON`, `nextResponse`, `reset`

### Types

- `ChaosOptions` — `minLatencyMs?`, `failureRate?` (0–1)

## `ReplayFixture`

Replays **`CallRecord`** responses in order as synthetic **`Response`** objects (JSON content-type). Use for deterministic replays without live providers.
