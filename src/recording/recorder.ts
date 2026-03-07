export interface CallRecord {
  id: string;
  provider: string;
  method: string;
  url: string;
  requestBody?: unknown;
  responseStatus: number;
  responseBody?: unknown;
  durationMs: number;
}

export class Recorder {
  private seq = 0;
  private readonly calls: CallRecord[] = [];

  record(r: Omit<CallRecord, "id">): void {
    this.seq += 1;
    this.calls.push({ ...r, id: `c${this.seq}` });
  }

  all(): CallRecord[] {
    return [...this.calls];
  }

  filter(provider?: string): CallRecord[] {
    if (!provider) return this.all();
    return this.calls.filter((c) => c.provider === provider);
  }

  clear(): void {
    this.calls.length = 0;
    this.seq = 0;
  }
}
