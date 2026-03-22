from __future__ import annotations

import json
from typing import Any

from stubfetch.recorder import CallRecord


def export_recording_json(calls: list[CallRecord]) -> str:
    return json.dumps([c.__dict__ for c in calls], indent=2)


def export_recording_markdown(calls: list[CallRecord]) -> str:
    lines = ["# stubfetch recording", ""]
    for c in calls:
        lines.append(f"## {c.provider} {c.method} {c.url}")
        lines.append(f"- status: {c.response_status}")
        lines.append("")
    return "\n".join(lines)


def export_har(calls: list[CallRecord], title: str = "stubfetch") -> str:
    entries = []
    for c in calls:
        entries.append(
            {
                "request": {"method": c.method, "url": c.url},
                "response": {"status": c.response_status, "content": {"text": str(c.response_body)}},
            }
        )
    return json.dumps({"log": {"version": "1.2", "creator": {"name": title}, "entries": entries}}, indent=2)
