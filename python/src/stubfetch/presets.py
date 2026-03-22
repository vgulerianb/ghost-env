from __future__ import annotations

import json
import re
from typing import Any, Callable
from urllib.parse import parse_qs, urlparse

from stubfetch.world import WorldState


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


def s3(config: dict[str, Any]) -> dict[str, Any]:
    objects = config.get("objects") or []

    def norm_key(k: str) -> str:
        return k.lstrip("/")

    def seed(world: WorldState, rng: Callable[[], float]) -> None:
        for o in objects:
            b = str(o["bucket"])
            k = norm_key(str(o["key"]))
            world.set(
                "s3:object",
                f"{b}/{k}",
                {
                    "bucket": b,
                    "key": k,
                    "body": str(o.get("body", "")),
                    "etag": str(o.get("etag", f'"{b}-{k}"')),
                },
            )
        rng()

    def handle(url: str, method: str, _body: Any, world: WorldState) -> tuple[int, str] | None:
        if method != "GET":
            return None
        u = urlparse(url)
        path = u.path.rstrip("/") or "/"
        h = u.hostname or ""

        vh = re.match(r"^([^.]+)\.s3[.-][^/]+\.amazonaws\.com$", h, re.I)
        if vh:
            bucket = vh.group(1)
            key = norm_key(path[1:] if path.startswith("/") else path)
            if not key:
                return None
            rec = world.get("s3:object", f"{bucket}/{key}")
            if not rec:
                return (404, "Not Found")
            return (200, str(rec.get("body", "")))

        path_style = "amazonaws.com" in h and (h == "s3.amazonaws.com" or h.startswith("s3."))
        if path_style:
            parts = [p for p in path.split("/") if p]
            if not parts:
                return None
            bucket = parts[0]
            qs = parse_qs(u.query)
            lt = (qs.get("list-type") or [None])[0]
            if len(parts) == 1 and lt == "2":
                prefix = (qs.get("prefix") or [""])[0]
                contents: list[dict[str, Any]] = []
                for o in world.list("s3:object"):
                    if o.get("bucket") != bucket:
                        continue
                    kk = str(o.get("key", ""))
                    if not kk.startswith(prefix):
                        continue
                    contents.append(
                        {
                            "Key": kk,
                            "Size": len(str(o.get("body", "")).encode("utf-8")),
                            "ETag": o.get("etag"),
                        }
                    )
                payload = {
                    "Name": bucket,
                    "KeyCount": len(contents),
                    "IsTruncated": False,
                    "Contents": contents,
                }
                return (200, json.dumps(payload))
            if len(parts) < 2:
                return None
            key = norm_key("/".join(parts[1:]))
            rec = world.get("s3:object", f"{bucket}/{key}")
            if not rec:
                return (404, "Not Found")
            return (200, str(rec.get("body", "")))
        return None

    return {"name": "s3", "seed": seed, "handle": handle}


def slack(config: dict[str, Any] | None = None) -> dict[str, Any]:
    cfg = config or {}
    bot = str(cfg.get("bot_user_id", "UFAKEBOT"))

    def seed(_world: WorldState, rng: Callable[[], float]) -> None:
        rng()

    def handle(url: str, method: str, body: Any, _world: WorldState) -> tuple[int, str] | None:
        u = urlparse(url)
        h = u.hostname or ""
        if not h.endswith("slack.com"):
            return None
        p = u.path.rstrip("/") or "/"
        if p == "/api/auth.test" and method in ("GET", "POST"):
            return (
                200,
                json.dumps(
                    {
                        "ok": True,
                        "url": "https://acme.slack.com/",
                        "team": "acme",
                        "user": bot,
                        "team_id": "T0001",
                        "user_id": bot,
                    }
                ),
            )
        if p == "/api/chat.postMessage" and method == "POST":
            text = ""
            try:
                payload = json.loads(body) if isinstance(body, str) else (body or {})
                text = f'{payload.get("channel", "")}:{payload.get("text", "")}'
            except (json.JSONDecodeError, TypeError):
                text = ""
            ts = "1234567890.000100"
            return (
                200,
                json.dumps(
                    {
                        "ok": True,
                        "channel": "C0001",
                        "ts": ts,
                        "message": {"user": bot, "type": "message", "text": text},
                    }
                ),
            )
        return None

    return {"name": "slack", "seed": seed, "handle": handle}


def anthropic(config: dict[str, Any] | None = None) -> dict[str, Any]:
    cfg = config or {}
    texts = list(cfg.get("texts") or ["Hello from fake Claude"])
    state = {"i": 0}

    def seed(_world: WorldState, rng: Callable[[], float]) -> None:
        state["i"] = 0
        rng()

    def handle(url: str, method: str, _body: Any, _world: WorldState) -> tuple[int, str] | None:
        u = urlparse(url)
        if "api.anthropic.com" not in (u.hostname or ""):
            return None
        if method != "POST" or "/v1/messages" not in u.path:
            return None
        i = state["i"]
        state["i"] = i + 1
        text = texts[i % len(texts)]
        payload = {
            "id": f"msg_{i}",
            "type": "message",
            "role": "assistant",
            "model": str(cfg.get("model", "claude-3-5-sonnet-20241022")),
            "content": [{"type": "text", "text": text}],
            "stop_reason": "end_turn",
            "usage": {"input_tokens": 1, "output_tokens": 1},
        }
        return (200, json.dumps(payload))

    return {"name": "anthropic", "seed": seed, "handle": handle}
