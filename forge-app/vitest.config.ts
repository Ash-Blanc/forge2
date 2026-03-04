import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "happy-dom",
        globals: true,
        include: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
        exclude: ["node_modules", ".next"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});
