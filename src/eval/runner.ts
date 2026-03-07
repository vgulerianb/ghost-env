import { GhostEnv, type GhostEnvConfig } from "../ghost-env.js";

export interface Scenario {
  name: string;
  config: GhostEnvConfig;
  run: (env: GhostEnv) => Promise<void> | void;
  assert?: (env: GhostEnv) => void;
}

export interface EvalReport {
  results: Array<{ name: string; ok: boolean; error?: string }>;
  passRate: number;
}

export async function runEval(scenarios: Scenario[]): Promise<EvalReport> {
  const results: EvalReport["results"] = [];
  for (const s of scenarios) {
    const env = new GhostEnv(s.config);
    try {
      await s.run(env);
      s.assert?.(env);
      results.push({ name: s.name, ok: true });
    } catch (e) {
      results.push({ name: s.name, ok: false, error: String(e) });
    }
  }
  const ok = results.filter((r) => r.ok).length;
  return { results, passRate: ok / Math.max(results.length, 1) };
}

export function defineScenario(s: Scenario): Scenario {
  return s;
}
