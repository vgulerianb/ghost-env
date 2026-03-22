export interface ChaosOptions {
  /** Extra delay before each handled response (ms). */
  minLatencyMs?: number;
  /** 0..1 fraction of requests that return 500. */
  failureRate?: number;
}

export async function applyChaos<T>(
  opts: ChaosOptions | undefined,
  rng: () => number,
  fn: () => Promise<T>,
): Promise<T> {
  if (opts?.minLatencyMs) {
    await new Promise((r) => setTimeout(r, opts.minLatencyMs));
  }
  if (opts?.failureRate && rng() < opts.failureRate) {
    throw new Error("stubfetch chaos: simulated failure");
  }
  return fn();
}
