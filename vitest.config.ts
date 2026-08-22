import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      // Excluded deliberately, not to flatter the number:
      //   gemini.ts   - network I/O behind a server-only guard
      //   speech.ts   - thin wrapper over Web Speech / Audio
      //   a11y.ts     - React hooks over prefers-reduced-motion
      //   store.ts    - React hook; its logic lives in model.ts, which is tested
      //   *.tsx       - components, covered by the manual E2E script
      exclude: [
        "lib/**/*.test.ts",
        "lib/gemini.ts",
        "lib/speech.ts",
        "lib/a11y.ts",
        "lib/store.ts",
        "lib/*.tsx",
      ],
      thresholds: { statements: 85, branches: 80, functions: 85, lines: 85 },
    },
  },
});
