import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts', './test/setup.ts'],
    exclude: [
      'src/utils/domain.test.ts',
      'src/lib/errors/DomainError.test.ts',
    ],
  },
});
