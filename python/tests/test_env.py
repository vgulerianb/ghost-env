from ghost_env import GhostEnv, github, stripe, postgres, export_recording_json, run_eval, define_scenario


def test_github_get():
    env = GhostEnv(
        {
            "seed": 1,
            "providers": [github({"issues": [{"repo": "acme/api", "title": "Bug", "body": "x"}]})],
        }
    )
    status, text = env.fetch("https://api.github.com/repos/acme/api/issues")
    assert status == 200
    assert "Bug" in text
    assert env.was_called("github", method="GET")


def test_stripe():
    env = GhostEnv({"providers": [stripe({"customers": [{"email": "a@b.com"}]})]})
    status, text = env.fetch("https://api.stripe.com/v1/customers")
    assert status == 200
    assert "a@b.com" in text


def test_export():
    env = GhostEnv({"providers": [github({"issues": []})]})
    env.fetch("https://api.github.com/repos/acme/api/issues")
    assert "github" in export_recording_json(env.calls())


def test_eval():
    report = run_eval(
        [
            define_scenario(
                name="ok",
                config={"providers": [github({"issues": [{"repo": "acme/api", "title": "t"}]})]},
                run=lambda e: e.fetch("https://api.github.com/repos/acme/api/issues"),
                check=lambda e: e.was_called("github"),
            )
        ]
    )
    assert report["pass_rate"] == 1.0
