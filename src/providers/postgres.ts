import type { WorldState } from "../world/state.js";

export interface PostgresConfig {
  tables?: Record<string, Record<string, unknown>[]>;
}

export function postgresProvider(name: string, config: PostgresConfig) {
  return {
    name,
    seed(world: WorldState) {
      for (const [table, rows] of Object.entries(config.tables ?? {})) {
        rows.forEach((row, i) => {
          const id = String((row as { id?: unknown }).id ?? i);
          world.set(`pg:${table}`, id, row);
        });
      }
    },
  };
}
