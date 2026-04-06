import { defineConfig } from 'vitest/config';

/**
 * Unit tests live under `tests/` so `pnpm compile:ts` (Sucrase on `src/`) does not emit them into `resources/core`.
 *
 * GTA plugin: `tests/unit/gta/` — pure logic + mocked mysql2 / alt-server. Full alt:V client/server
 * integration is not runnable inside Vitest; use in-game UAT for event flows.
 */
export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        globals: false,
        coverage: {
            provider: 'v8',
            include: ['src/plugins/gta-mysql-core/**/*.ts'],
            exclude: ['**/node_modules/**'],
            reporter: ['text', 'html'],
        },
    },
});
