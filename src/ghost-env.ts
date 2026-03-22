import type { ChaosOptions } from "./chaos.js";
import { applyChaos } from "./chaos.js";
import { Recorder, type CallRecord } from "./recording/recorder.js";
import { mulberry32 } from "./world/seed.js";
import { WorldState } from "./world/state.js";

export interface Provider {
  name: string;
  seed?: (world: WorldState, rng: () => number) => void;
  handle?: (url: URL, method: string, body: unknown, world: WorldState) => Promise<Response | null>;
}

export interface GhostEnvConfig {
  seed?: number;
  providers: Provider[];
  chaos?: ChaosOptions;
}

export class GhostEnv {
  readonly world = new WorldState();
  private readonly recorder = new Recorder();
  private readonly rng: () => number;
  private readonly providers: Provider[];
  private readonly chaos?: ChaosOptions;
  private snapshotStr: string | null = null;

  constructor(config: GhostEnvConfig) {
    this.providers = config.providers;
    this.chaos = config.chaos;
    this.rng = mulberry32(config.seed ?? 1);
    for (const p of this.providers) {
      p.seed?.(this.world, this.rng);
    }
  }

  reset(): void {
    if (this.snapshotStr == null) {
      this.recorder.clear();
      this.world.restore("{}");
      for (const p of this.providers) {
        p.seed?.(this.world, this.rng);
      }
      return;
    }
    this.world.restore(this.snapshotStr);
    this.recorder.clear();
  }

  snapshot(): string {
    this.snapshotStr = this.world.snapshot();
    return this.snapshotStr;
  }

  restore(data: string): void {
    this.world.restore(data);
  }

  async fetch(input: string | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? new URL(input) : new URL(input.toString());
    const method = (init?.method ?? "GET").toUpperCase();
    let body: unknown;
    if (init?.body) {
      const t = typeof init.body === "string" ? init.body : String(init.body);
      try {
        body = JSON.parse(t);
      } catch {
        body = t;
      }
    }
    const start = performance.now();
    let matchedName = "unknown";
    const run = async () => {
      for (const p of this.providers) {
        if (!p.handle) continue;
        const res = await p.handle(url, method, body, this.world);
        if (res) {
          matchedName = p.name;
          return res;
        }
      }
      throw new Error(`stubfetch: no provider matched ${method} ${url}`);
    };
    try {
      const res = await applyChaos(this.chaos, this.rng, run);
      const text = await res.clone().text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* keep string */
      }
      const rec: Omit<CallRecord, "id"> = {
        provider: matchedName,
        method,
        url: url.toString(),
        requestBody: body,
        responseStatus: res.status,
        responseBody: parsed,
        durationMs: performance.now() - start,
      };
      this.recorder.record(rec);
      return res;
    } catch (e) {
      this.recorder.record({
        provider: "error",
        method,
        url: url.toString(),
        requestBody: body,
        responseStatus: 500,
        responseBody: String(e),
        durationMs: performance.now() - start,
      });
      throw e;
    }
  }

  calls(provider?: string): CallRecord[] {
    return this.recorder.filter(provider);
  }

  wasCalled(
    provider: string,
    partial?: Partial<Pick<CallRecord, "method" | "url">> & { pathIncludes?: string },
  ): boolean {
    return this.calls(provider).some((c) => {
      if (partial?.method && c.method !== partial.method) return false;
      if (partial?.url && c.url !== partial.url) return false;
      if (partial?.pathIncludes && !c.url.includes(partial.pathIncludes)) return false;
      return true;
    });
  }

  /** Minimal SQL facade backed by world entities `pg:table`. */
  db(_name = "postgres") {
    const world = this.world;
    return {
      async query(sql: string, params: unknown[] = []) {
        const m = sql.match(/FROM\s+(\w+)/i);
        const table = m?.[1]?.toLowerCase() ?? "unknown";
        const rows = world.list(`pg:${table}`) as Record<string, unknown>[];
        const filtered =
          /WHERE\s+(\w+)\s*=\s*\$1/i.test(sql) && params.length
            ? rows.filter((r) => String(r[params[0] === "admin" ? "role" : Object.keys(r)[0]]) === String(params[0]))
            : rows;
        return { rows: filtered, rowCount: filtered.length };
      },
    };
  }
}
