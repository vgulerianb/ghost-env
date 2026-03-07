import type { WorldState } from "../world/state.js";

export interface StripeConfig {
  customers?: Array<{ id?: string; email: string }>;
}

export function stripeProvider(name: string, config: StripeConfig) {
  return {
    name,
    seed(world: WorldState, rng: () => number) {
      let i = 0;
      for (const c of config.customers ?? []) {
        i += 1;
        const id = c.id ?? `cus_${i}`;
        world.set("stripe_customer", id, { id, email: c.email, object: "customer" });
      }
      void rng;
    },
    async handle(url: URL, method: string, _body: unknown, world: WorldState): Promise<Response | null> {
      if (method !== "GET") return null;
      if (url.pathname === "/v1/customers" || url.pathname === "/v1/customers/") {
        const data = world.list("stripe_customer");
        return new Response(
          JSON.stringify({ object: "list", data, has_more: false }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return null;
    },
  };
}
