import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Fixed non-Vietnam timezone so any accidental dependence on the host zone fails tests.
process.env.TZ = "America/Los_Angeles";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { TZ: "America/Los_Angeles" },
  },
});
