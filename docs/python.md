# Python package

## Install

```bash
pip install -e ./python
# optional: pip install -e '.[dev]' && pytest
```

## Usage

```python
from ghost_env import GhostEnv, github, export_recording_json

env = GhostEnv(
    {
        "seed": 1,
        "providers": [github({"issues": [{"repo": "acme/api", "title": "Bug"}]})],
    }
)
status, text = env.fetch("https://api.github.com/repos/acme/api/issues")
assert status == 200
assert "Bug" in text
print(export_recording_json(env.calls()))
```

## Differences from Node

- **`fetch`** returns **`(status: int, body: str)`** instead of `Response`.
- Presets are functions returning **`dict`** provider specs: `github`, `stripe`, `postgres`, `s3`, `slack`, `anthropic` (see `ghost_env.presets`).
- **OpenAI**-style preset is not mirrored in Python yet; extend `presets.py` if needed.

## Modules

| Module | Role |
|--------|------|
| `ghost_env.ghost_env` | `GhostEnv`, config types |
| `ghost_env.presets` | Built-in provider factories |
| `ghost_env.export` | JSON / Markdown / HAR export |
| `ghost_env.eval_runner` | `run_eval`, `define_scenario` |
| `ghost_env.replay` | `ReplayFixture` |
