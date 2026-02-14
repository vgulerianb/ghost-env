import type { WorldState } from "../world/state.js";

export interface S3ObjectSeed {
  bucket: string;
  key: string;
  body?: string;
  etag?: string;
}

export interface S3Config {
  objects?: S3ObjectSeed[];
}

function normKey(key: string): string {
  return key.replace(/^\/+/, "");
}

/** Minimal S3-shaped HTTP (list bucket + get object) for agent tests. */
export function s3Provider(name: string, config: S3Config) {
  return {
    name,
    seed(world: WorldState, rng: () => number) {
      for (const o of config.objects ?? []) {
        const b = o.bucket;
        const k = normKey(o.key);
        world.set("s3:object", `${b}/${k}`, {
          bucket: b,
          key: k,
          body: o.body ?? "",
          etag: o.etag ?? `"${b}-${k}"`,
        });
      }
      void rng;
    },
    async handle(url: URL, method: string, _body: unknown, world: WorldState): Promise<Response | null> {
      if (method !== "GET") return null;
      const h = url.hostname;
      const path = url.pathname.replace(/\/+$/, "") || "/";

      // Virtual-hosted–style: mybucket.s3.amazonaws.com/object/key
      const vh = h.match(/^([^.]+)\.s3[.-][^/]+\.amazonaws\.com$/i);
      if (vh) {
        const bucket = vh[1];
        const key = normKey(path.slice(1));
        if (!key) return null;
        const rec = world.get("s3:object", `${bucket}/${key}`) as
          | { body: string; etag: string }
          | undefined;
        if (!rec) return new Response("Not Found", { status: 404 });
        return new Response(rec.body, {
          status: 200,
          headers: { "Content-Type": "application/octet-stream", ETag: rec.etag },
        });
      }

      // Path-style: s3.amazonaws.com/bucket/key
      const pathStyleS3 =
        url.hostname.includes("amazonaws.com") &&
        (url.hostname === "s3.amazonaws.com" || url.hostname.startsWith("s3."));
      if (pathStyleS3) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length < 1) return null;
        const bucket = parts[0];
        const prefix = url.searchParams.get("prefix") ?? "";
        const listType = url.searchParams.get("list-type");
        if (parts.length === 1 && listType === "2") {
          const all = world.list("s3:object") as Array<{ bucket: string; key: string; body: string; etag: string }>;
          const contents = all
            .filter((o) => o.bucket === bucket && o.key.startsWith(prefix))
            .map((o) => ({
              Key: o.key,
              Size: Buffer.byteLength(o.body, "utf8"),
              ETag: o.etag,
            }));
          const payload = {
            Name: bucket,
            KeyCount: contents.length,
            IsTruncated: false,
            Contents: contents,
          };
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (parts.length < 2) return null;
        const key = normKey(parts.slice(1).join("/"));
        const rec = world.get("s3:object", `${bucket}/${key}`) as
          | { body: string; etag: string }
          | undefined;
        if (!rec) return new Response("Not Found", { status: 404 });
        return new Response(rec.body, {
          status: 200,
          headers: { "Content-Type": "application/octet-stream", ETag: rec.etag },
        });
      }

      return null;
    },
  };
}

export function s3(config: S3Config) {
  return s3Provider("s3", config);
}
