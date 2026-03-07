export type Entity = Record<string, unknown>;

export class WorldState {
  private readonly entities = new Map<string, Map<string, Entity>>();

  list(type: string): Entity[] {
    return [...(this.entities.get(type)?.values() ?? [])];
  }

  get(type: string, id: string): Entity | undefined {
    return this.entities.get(type)?.get(id);
  }

  set(type: string, id: string, value: Entity): void {
    if (!this.entities.has(type)) this.entities.set(type, new Map());
    this.entities.get(type)!.set(id, value);
  }

  delete(type: string, id: string): void {
    this.entities.get(type)?.delete(id);
  }

  snapshot(): string {
    const o: Record<string, Record<string, Entity>> = {};
    for (const [t, m] of this.entities) {
      o[t] = Object.fromEntries(m);
    }
    return JSON.stringify(o);
  }

  restore(snapshot: string): void {
    this.entities.clear();
    const o = JSON.parse(snapshot) as Record<string, Record<string, Entity>>;
    for (const [t, rows] of Object.entries(o)) {
      this.entities.set(t, new Map(Object.entries(rows)));
    }
  }
}
