import type { WorldState } from "../world/state.js";

export interface GithubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  labels: string[];
}

export interface GithubConfig {
  issues?: Array<{ repo: string; title: string; body?: string; labels?: string[]; state?: string }>;
}

function parseRepoIssuesPath(pathname: string): { owner: string; repo: string } | null {
  const m = pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/issues\/?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

function nextId(world: WorldState): number {
  const existing = world.list("github_issue") as Array<{ id: number }>;
  return existing.reduce((m, x) => Math.max(m, x.id), 0) + 1;
}

export function githubProvider(name: string, config: GithubConfig) {
  return {
    name,
    seed(world: WorldState, rng: () => number) {
      let n = 1;
      for (const it of config.issues ?? []) {
        const id = nextId(world);
        world.set("github_issue", `${it.repo}#${n}`, {
          id,
          number: n,
          repo: it.repo,
          title: it.title,
          body: it.body ?? "",
          state: it.state ?? "open",
          labels: it.labels ?? [],
        });
        n += 1;
      }
      void rng;
    },
    async handle(url: URL, method: string, body: unknown, world: WorldState): Promise<Response | null> {
      const path = url.pathname;
      const list = parseRepoIssuesPath(path);
      if (list && method === "GET") {
        const keyPrefix = `${list.owner}/${list.repo}`;
        const issues = world
          .list("github_issue")
          .filter((x) => String((x as { repo: string }).repo) === keyPrefix) as unknown as GithubIssue[];
        return new Response(JSON.stringify(issues), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const create = path.match(/^\/repos\/([^/]+)\/([^/]+)\/issues\/?$/);
      if (create && method === "POST") {
        const repo = `${create[1]}/${create[2]}`;
        const payload = (typeof body === "object" && body ? body : {}) as { title?: string; body?: string };
        const num = world.list("github_issue").filter((x) => (x as { repo: string }).repo === repo).length + 1;
        const id = nextId(world);
        const issue: GithubIssue = {
          id,
          number: num,
          title: payload.title ?? "untitled",
          body: payload.body ?? "",
          state: "open",
          labels: [],
        };
        world.set("github_issue", `${repo}#${num}`, { ...issue, repo });
        return new Response(JSON.stringify(issue), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return null;
    },
  };
}
