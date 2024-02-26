from __future__ import annotations

import json
import re
import time
from typing import Any, Callable, TypedDict

from ghost_env.recorder import Recorder
from ghost_env.seed import mulberry32
from ghost_env.world import WorldState


class Provider(TypedDict, total=False):
    name: str
    seed: Callable[[WorldState, Callable[[], float]], None]
    handle: Callable[[str, str, Any, WorldState], tuple[int, str] | None]


class GhostEnvConfig(TypedDict, total=False):
    seed: int
    providers: list[Provider]
    chaos: dict[str, Any]


class GhostEnv:
    def __init__(self, config: GhostEnvConfig) -> None:
        self.world = WorldState()
        self._recorder = Recorder()
        self._providers = config["providers"]
        self._chaos = config.get("chaos") or {}
        self._rng = mulberry32(int(config.get("seed", 1)))
        self._snap: str | None = None
        for p in self._providers:
            if p.get("seed"):
                p["seed"](self.world, self._rng)

    def reset(self) -> None:
        if self._snap is None:
            self._recorder.clear()
            self.world.restore("{}")
            for p in self._providers:
                if p.get("seed"):
                    p["seed"](self.world, self._rng)
            return
        self.world.restore(self._snap)
        self._recorder.clear()

    def snapshot(self) -> str:
        self._snap = self.world.snapshot()
        return self._snap

    def restore(self, data: str) -> None:
        self.world.restore(data)

    def fetch(self, url: str, method: str = "GET", body: str | None = None) -> tuple[int, str]:
        parsed_body: Any = None
        if body:
            try:
                parsed_body = json.loads(body)
            except json.JSONDecodeError:
                parsed_body = body
        start = time.perf_counter()
        matched = "unknown"

        lat = float(self._chaos.get("min_latency_ms", 0) or 0)
        if lat:
            time.sleep(lat / 1000.0)
        fr = float(self._chaos.get("failure_rate", 0) or 0)
        if fr and self._rng() < fr:
            self._recorder.record(
                provider="error",
                method=method,
                url=url,
                request_body=parsed_body,
                response_status=500,
                response_body="chaos",
                duration_ms=(time.perf_counter() - start) * 1000,
            )
            raise RuntimeError("ghost-env chaos")

        status = 500
        text = ""
        try:
            for p in self._providers:
                h = p.get("handle")
                if not h:
                    continue
                res = h(url, method.upper(), parsed_body, self.world)
                if res:
                    matched = p["name"]
                    status, text = res
                    break
            else:
                raise RuntimeError(f"ghost-env: no provider matched {method} {url}")
        except Exception as e:  # noqa: BLE001
            self._recorder.record(
                provider="error",
                method=method,
                url=url,
                request_body=parsed_body,
                response_status=500,
                response_body=str(e),
                duration_ms=(time.perf_counter() - start) * 1000,
            )
            raise

        duration = (time.perf_counter() - start) * 1000
        try:
            parsed_resp = json.loads(text)
        except json.JSONDecodeError:
            parsed_resp = text
        self._recorder.record(
            provider=matched,
            method=method,
            url=url,
            request_body=parsed_body,
            response_status=status,
            response_body=parsed_resp,
            duration_ms=duration,
        )
        return status, text

    def calls(self, provider: str | None = None):
        return self._recorder.filter(provider)

    def was_called(self, provider: str, **kwargs: Any) -> bool:
        method = kwargs.get("method")
        path_includes = kwargs.get("path_includes")
        for c in self.calls(provider):
            if method and c.method != method:
                continue
            if path_includes and path_includes not in c.url:
                continue
            return True
        return False

    def db(self, _name: str = "postgres"):
        world = self.world

        class Db:
            @staticmethod
            def query(sql: str, params: list[Any] | None = None):
                params = params or []
                m = re.search(r"FROM\s+(\w+)", sql, re.I)
                table = (m.group(1).lower() if m else "unknown")
                rows = world.list(f"pg:{table}")
                return {"rows": rows, "row_count": len(rows)}

        return Db()
