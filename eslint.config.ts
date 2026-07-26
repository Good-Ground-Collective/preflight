import tseslint from 'typescript-eslint';
import preflight from './src/index.js';

export default tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'node_modules/'],
  },
  ...tseslint.configs.recommended,
  // Dogfood: preflight lints its own source with its recommended ruleset.
  ...(preflight.configs as Record<string, object[]>)['recommended']!,
  // Tool entry points (ESLint, tsup, vitest) require default-exported config objects.
  {
    files: ['eslint.config.ts', 'tsup.config.ts', 'vitest.config.ts'],
    rules: { 'import-x/no-default-export': 'off' },
  },
  // Test fixtures deliberately contain the exact patterns the rules ban, and test helpers are idiomatic vitest.
  {
    files: ['tests/**'],
    rules: {
      'preflight/no-loose-functions': 'off',
      'preflight/no-paragraph-comments': 'off',
      'preflight/no-planning-identifiers': 'off',
    },
  },
);
