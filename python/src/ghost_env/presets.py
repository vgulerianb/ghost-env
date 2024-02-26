from __future__ import annotations

import json
import re
from typing import Any, Callable
from urllib.parse import urlparse

from ghost_env.world import WorldState


def _next_github_id(world: WorldState) -> int:
    xs = world.list("github_issue")
    return max((int(x.get("id", 0)) for x in xs), default=0) + 1


def github(config: dict[str, Any]) -> dict[str, Any]:
    issues = config.get("issues") or []

    def seed(world: WorldState, rng: Callable[[], float]) -> None:
        for i, it in enumerate(issues, start=1):
            rid = _next_github_id(world)
            world.set(
                "github_issue",
                f"{it['repo']}#{i}",
                {
                    "id": rid,
                    "number": i,
                    "repo": it["repo"],
                    "title": it["title"],
                    "body": it.get("body", ""),
                    "state": it.get("state", "open"),
                    "labels": it.get("labels", []),
                },
            )
        rng()

    def handle(url: str, method: str, body: Any, world: WorldState):
        p = urlparse(url).path
        m = re.match(r"^/repos/([^/]+)/([^/]+)/issues/?$", p)
        if m and method == "GET":
            prefix = f"{m.group(1)}/{m.group(2)}"
            data = [x for x in world.list("github_issue") if x.get("repo") == prefix]
            return (200, json.dumps(data))
        if m and method == "POST":
            repo = f"{m.group(1)}/{m.group(2)}"
            payload = json.loads(body) if isinstance(body, str) else (body or {})
            num = len([x for x in world.list("github_issue") if x.get("repo") == repo]) + 1
            rid = _next_github_id(world)
            issue = {
                "id": rid,
                "number": num,
                "title": payload.get("title", "untitled"),
                "body": payload.get("body", ""),
                "state": "open",
                "labels": [],
                "repo": repo,
            }
            world.set("github_issue", f"{repo}#{num}", issue)
            public = {k: v for k, v in issue.items() if k != "repo"}
            return (201, json.dumps(public))
        return None

    return {"name": "github", "seed": seed, "handle": handle}


def stripe(config: dict[str, Any]) -> dict[str, Any]:
    customers = config.get("customers") or []

    def seed(world: WorldState, rng: Callable[[], float]) -> None:
        for i, c in enumerate(customers, start=1):
            cid = c.get("id") or f"cus_{i}"
            world.set("stripe_customer", cid, {"id": cid, "email": c["email"], "object": "customer"})
        rng()

    def handle(url: str, method: str, _body: Any, world: WorldState):
        p = urlparse(url).path
        if method == "GET" and p.rstrip("/") == "/v1/customers":
            data = world.list("stripe_customer")
            return (200, json.dumps({"object": "list", "data": data, "has_more": False}))
        return None

    return {"name": "stripe", "seed": seed, "handle": handle}


def postgres(config: dict[str, Any]) -> dict[str, Any]:
    tables = config.get("tables") or {}

    def seed(world: WorldState, rng: Callable[[], float]) -> None:
        for table, rows in tables.items():
            for i, row in enumerate(rows):
                rid = str(row.get("id", i))
                world.set(f"pg:{table}", rid, dict(row))
        rng()

    return {"name": "postgres", "seed": seed, "handle": None}
