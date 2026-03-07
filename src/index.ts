export { GhostEnv, type GhostEnvConfig, type Provider } from "./ghost-env.js";
export { WorldState } from "./world/state.js";
export { mulberry32 } from "./world/seed.js";
export { Recorder, type CallRecord } from "./recording/recorder.js";
export { exportRecordingJSON, exportRecordingMarkdown, exportHAR } from "./recording/export.js";
export { githubProvider, type GithubConfig } from "./providers/github.js";
export { stripeProvider, type StripeConfig } from "./providers/stripe.js";
export { postgresProvider, type PostgresConfig } from "./providers/postgres.js";
export { openaiProvider, openai, type OpenAIConfig } from "./providers/openai.js";
export { runEval, defineScenario, type Scenario, type EvalReport } from "./eval/runner.js";
export { ReplayFixture } from "./replay.js";
export type { ChaosOptions } from "./chaos.js";

import { githubProvider } from "./providers/github.js";
import { stripeProvider } from "./providers/stripe.js";
import { postgresProvider } from "./providers/postgres.js";
import type { GithubConfig } from "./providers/github.js";
import type { StripeConfig } from "./providers/stripe.js";
import type { PostgresConfig } from "./providers/postgres.js";
import type { Provider } from "./ghost-env.js";

export function github(config: GithubConfig): Provider {
  return githubProvider("github", config);
}

export function stripe(config: StripeConfig): Provider {
  return stripeProvider("stripe", config);
}

export function postgres(config: PostgresConfig): Provider {
  return postgresProvider("postgres", config);
}
