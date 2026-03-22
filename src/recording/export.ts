import type { CallRecord } from "./recorder.js";

export function exportRecordingJSON(calls: CallRecord[]): string {
  return JSON.stringify(calls, null, 2);
}

export function exportRecordingMarkdown(calls: CallRecord[]): string {
  const lines = ["# stubfetch recording", ""];
  for (const c of calls) {
    lines.push(`## ${c.provider} ${c.method} ${c.url}`);
    lines.push(`- status: ${c.responseStatus}`);
    lines.push(`- durationMs: ${c.durationMs}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function exportHAR(calls: CallRecord[], title = "stubfetch"): string {
  const entries = calls.map((c, i) => ({
    startedDateTime: new Date().toISOString(),
    time: c.durationMs,
    request: {
      method: c.method,
      url: c.url,
      headers: [],
    },
    response: {
      status: c.responseStatus,
      content: { text: typeof c.responseBody === "string" ? c.responseBody : JSON.stringify(c.responseBody) },
    },
    _provider: c.provider,
    _id: c.id,
  }));
  return JSON.stringify({ log: { version: "1.2", creator: { name: title }, entries } }, null, 2);
}
