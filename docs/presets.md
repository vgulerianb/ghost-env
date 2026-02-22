# Presets

Each preset is a **`Provider`**: optional **`seed`** (mutates `WorldState`) and optional **`handle`** (returns a `Response` or `null`).

Helper factories (`github`, `stripe`, …) wrap `*Provider` with a default name.

## GitHub (`github`)

- **GET** `https://api.github.com/repos/{owner}/{repo}/issues` — list issues for `repo` as `owner/repo`.
- **POST** same path — create issue from JSON body.

**Config:** `issues?: Array<{ repo: string; title: string; body?: string; labels?: string[]; state?: string }>`

## Stripe (`stripe`)

- **GET** `https://api.stripe.com/v1/customers` — list seeded customers.

**Config:** `customers?: Array<{ id?: string; email: string }>`

## Postgres facade (`postgres`)

No HTTP handler. Seeds rows into **`WorldState`** under `pg:{table}`.

**Config:** `tables?: Record<string, Array<Record<string, unknown>>>`

Use **`env.db().query(sql, params)`** — minimal parser: `FROM table` and optional `WHERE col = $1` (heuristic).

## OpenAI (`openai`)

- **POST** hosts matching `api.openai.com`, typically chat/completions paths.

**Config:** `responses?: Array<{ match?: { model?: string }; response: Record<string, unknown> }>`  
Cycles through `responses`; defaults to a tiny canned `choices` payload.

## Anthropic (`anthropic`)

- **POST** `api.anthropic.com` paths containing `/v1/messages`.

**Config:** `texts?: string[]` (rotated per request), `model?: string`

## S3-shaped (`s3`)

- **Virtual-hosted:** `https://{bucket}.s3…amazonaws.com/{key}` — GET object.
- **Path-style:** `https://s3.amazonaws.com/{bucket}/{key}` — GET object.
- **List:** `GET https://s3.amazonaws.com/{bucket}?list-type=2&prefix=…`

**Config:** `objects?: Array<{ bucket: string; key: string; body?: string; etag?: string }>`

## Slack (`slack`)

- **GET/POST** `https://slack.com/api/auth.test`
- **POST** `https://slack.com/api/chat.postMessage`

**Config:** `botUserId?: string`

## Custom providers

Implement **`Provider`**: `name`, optional `seed(world, rng)`, optional `handle(url, method, body, world)` returning `Promise<Response | null>`. Register alongside built-ins.
