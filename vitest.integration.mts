import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Same fixed non-Vietnam timezone as the unit config.
process.env.TZ = "America/Los_Angeles";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/server/**/*.int.test.ts"],
    fileParallelism: false,
    globalSetup: "src/server/test/global-setup.ts",
    env: { TZ: "America/Los_Angeles" },
  },
});
