import { defineConfig } from 'vitest/config';

/** Unit tests live under `tests/` so `pnpm compile:ts` (Sucrase on `src/`) does not emit them into `resources/core`. */
export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        globals: false,
    },
});
