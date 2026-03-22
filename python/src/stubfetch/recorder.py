from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class CallRecord:
    id: str
    provider: str
    method: str
    url: str
    request_body: Any
    response_status: int
    response_body: Any
    duration_ms: float


class Recorder:
    def __init__(self) -> None:
        self._calls: list[CallRecord] = []
        self._seq = 0

    def record(self, **kwargs: Any) -> None:
        self._seq += 1
        self._calls.append(CallRecord(id=f"c{self._seq}", **kwargs))

    def all(self) -> list[CallRecord]:
        return list(self._calls)

    def filter(self, provider: str | None = None) -> list[CallRecord]:
        if not provider:
            return self.all()
        return [c for c in self._calls if c.provider == provider]

    def clear(self) -> None:
        self._calls.clear()
        self._seq = 0
