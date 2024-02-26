# ghost-env (Python)

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -e '.[dev]'
pytest
```

API mirrors the npm package: `GhostEnv`, `github()`, `stripe()`, `postgres()`, `export_recording_json`, `run_eval`.
