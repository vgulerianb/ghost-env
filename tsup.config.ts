import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  minify: true,
  treeshake: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  target: "node18",
  platform: "node",
});
