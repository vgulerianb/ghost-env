from __future__ import annotations

import json
from typing import Any


class WorldState:
    def __init__(self) -> None:
        self._entities: dict[str, dict[str, dict[str, Any]]] = {}

    def list(self, typ: str) -> list[dict[str, Any]]:
        return list(self._entities.get(typ, {}).values())

    def get(self, typ: str, id_: str) -> dict[str, Any] | None:
        return self._entities.get(typ, {}).get(id_)

    def set(self, typ: str, id_: str, value: dict[str, Any]) -> None:
        self._entities.setdefault(typ, {})[id_] = value

    def snapshot(self) -> str:
        return json.dumps(self._entities)

    def restore(self, data: str) -> None:
        self._entities = json.loads(data) if data else {}
