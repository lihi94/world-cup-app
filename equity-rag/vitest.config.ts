import { defineConfig } from "vitest/config";

// Standalone config so vitest doesn't walk up and load the parent
// world-cup-app's vite.config.ts (different project, different deps).
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
