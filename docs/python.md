# Python package

## Install

```bash
pip install -e ./python
# optional: pip install -e '.[dev]' && pytest
```

## Usage

```python
from stubfetch import GhostEnv, github, export_recording_json

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
- Presets are functions returning **`dict`** provider specs: `github`, `stripe`, `postgres`, `s3`, `slack`, `anthropic` (see `stubfetch.presets`).
- **OpenAI**-style preset is not mirrored in Python yet; extend `presets.py` if needed.

## Modules

| Module | Role |
|--------|------|
| `stubfetch.ghost_env` | `GhostEnv`, config types |
| `stubfetch.presets` | Built-in provider factories |
| `stubfetch.export` | JSON / Markdown / HAR export |
| `stubfetch.eval_runner` | `run_eval`, `define_scenario` |
| `stubfetch.replay` | `ReplayFixture` |
