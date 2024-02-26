from __future__ import annotations

import json
from typing import Any

from ghost_env.recorder import CallRecord


class ReplayFixture:
    def __init__(self, calls: list[dict[str, Any]]) -> None:
        self._calls = calls
        self._idx = 0

    @classmethod
    def from_json(cls, raw: str) -> ReplayFixture:
        data = json.loads(raw)
        return cls(data)

    def next_response(self) -> tuple[int, str] | None:
        if self._idx >= len(self._calls):
            return None
        c = self._calls[self._idx]
        self._idx += 1
        body = c.get("response_body")
        text = body if isinstance(body, str) else json.dumps(body)
        return int(c.get("response_status", 200)), text

    def reset(self) -> None:
        self._idx = 0
