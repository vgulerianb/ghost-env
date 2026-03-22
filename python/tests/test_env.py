from stubfetch import (
    GhostEnv,
    anthropic,
    github,
    postgres,
    s3,
    slack,
    stripe,
    export_recording_json,
    run_eval,
    define_scenario,
)


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


def test_s3_get_and_list():
    env = GhostEnv(
        {
            "providers": [
                s3(
                    {
                        "objects": [
                            {"bucket": "b", "key": "p/x", "body": "1"},
                            {"bucket": "b", "key": "p/y", "body": "2"},
                        ]
                    }
                )
            ]
        }
    )
    st, body = env.fetch("https://s3.amazonaws.com/b/p/x")
    assert st == 200
    assert body == "1"
    st2, js = env.fetch("https://s3.amazonaws.com/b?list-type=2&prefix=p/")
    assert st2 == 200
    assert '"KeyCount": 2' in js


def test_slack_and_anthropic():
    env = GhostEnv({"providers": [slack(), anthropic({"texts": ["a", "b"]})]})
    st, t = env.fetch(
        "https://slack.com/api/chat.postMessage",
        "POST",
        '{"channel":"C1","text":"hi"}',
    )
    assert st == 200
    assert "hi" in t
    st2, m1 = env.fetch("https://api.anthropic.com/v1/messages", "POST", "{}")
    st3, m2 = env.fetch("https://api.anthropic.com/v1/messages", "POST", "{}")
    assert st2 == 200 and st3 == 200
    assert '"text": "a"' in m1 and '"text": "b"' in m2


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
