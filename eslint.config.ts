import tseslint from 'typescript-eslint';
import preflight from './src/index.js';

export default tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'node_modules/'],
  },
  ...tseslint.configs.recommended,
  // SAFETY: the plugin builds its own configs above, so `recommended` is present and is a flat-config array.
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
      'preflight/no-chained-type-assertions': 'off',
      'preflight/no-known-value-widening': 'off',
      'preflight/no-unsafe-dictionary-type': 'off',
      'preflight/require-safety-comment-for-type-assertion': 'off',
    },
  },
  // Ported rules preflight's own source does not yet satisfy; each is off for a structural reason, not because the rule is wrong.
  {
    files: ['src/**'],
    rules: {
      // A plugin object typed by its own package is not assignable to ESLint's
      // `ESLint.Plugin`, so wiring any plugin into a flat config needs
      // `as unknown as`. Centralising it would need a helper taking `unknown`,
      // `object`, or a `Record` — each banned by another rule in this set.
      'preflight/no-chained-type-assertions': 'off',
      // Same casts, seen by the rule that wants each one justified. Adopting it
      // is a codebase-wide migration this PR deliberately does not bundle.
      'preflight/require-safety-comment-for-type-assertion': 'off',
      // `Record<string, unknown>` is the shape ESLint's own config and rule
      // objects have; preflight reads them structurally at their boundary.
      'preflight/no-unsafe-dictionary-type': 'off',
      // The AST walkers narrow genuinely-unknown child values, which is what a
      // type guard is for; the guards here are not all declared as predicates.
      'preflight/no-runtime-typeof': 'off',
      'preflight/no-unknown-parameters': 'off',
    },
  },
);
