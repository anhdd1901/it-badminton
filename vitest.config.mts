import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Fixed non-Vietnam timezone so any accidental dependence on the host zone fails tests.
process.env.TZ = "America/Los_Angeles";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "src/server/**/*.int.test.ts"],
    env: { TZ: "America/Los_Angeles" },
  },
});
