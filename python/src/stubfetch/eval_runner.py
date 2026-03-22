from __future__ import annotations

from typing import Any, Callable, TypedDict

from stubfetch.ghost_env import GhostEnv, GhostEnvConfig


class Scenario(TypedDict, total=False):
    name: str
    config: GhostEnvConfig
    run: Callable[[GhostEnv], None]
    assert_: Callable[[GhostEnv], None]


def define_scenario(**kwargs: Any) -> dict[str, Any]:
    return kwargs


def run_eval(scenarios: list[dict[str, Any]]) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for s in scenarios:
        env = GhostEnv(s["config"])
        try:
            s["run"](env)
            check = s.get("check")
            if check:
                check(env)
            results.append({"name": s["name"], "ok": True})
        except Exception as e:  # noqa: BLE001
            results.append({"name": s["name"], "ok": False, "error": str(e)})
    ok = sum(1 for r in results if r["ok"])
    return {"results": results, "pass_rate": ok / max(len(results), 1)}
