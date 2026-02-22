# ghost-env (Python)

In-process fake HTTP APIs for tests—aligned with the [`ghost-env` npm package](../README.md).

## Install

```bash
pip install -e ./python
```

For development (tests):

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -e '.[dev]'
pytest
```

## Quick example

```python
from ghost_env import GhostEnv, github, export_recording_json

env = GhostEnv(
    {"seed": 1, "providers": [github({"issues": [{"repo": "acme/api", "title": "Bug"}]})]}
)
status, text = env.fetch("https://api.github.com/repos/acme/api/issues")
assert status == 200
print(export_recording_json(env.calls()))
```

## Documentation

Full docs: **[`docs/`](../docs/README.md)** — see [Getting started](../docs/getting-started.md), [Presets](../docs/presets.md), and [Python package](../docs/python.md) for Node/Python differences.

## License

Apache-2.0
