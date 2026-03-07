import type { CallRecord } from "./recording/recorder.js";

/** Replay saved responses in order (record/export roundtrip). */
export class ReplayFixture {
  private idx = 0;
  constructor(private readonly calls: CallRecord[]) {}

  static fromJSON(json: string): ReplayFixture {
    return new ReplayFixture(JSON.parse(json) as CallRecord[]);
  }

  nextResponse(): Response | null {
    const c = this.calls[this.idx];
    if (!c) return null;
    this.idx += 1;
    const body =
      typeof c.responseBody === "string" ? c.responseBody : JSON.stringify(c.responseBody ?? "");
    return new Response(body, { status: c.responseStatus, headers: { "Content-Type": "application/json" } });
  }

  reset(): void {
    this.idx = 0;
  }
}
