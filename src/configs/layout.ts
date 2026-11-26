import tsParser from '@typescript-eslint/parser';
import type { ESLint, Linter } from 'eslint';

/**
 * Opt-in filesystem rules. They read the disk and depend on each repo's
 * folder conventions, so they stay out of `go-no-go` and `recommended`;
 * `module-layout` does nothing until given options.
 */
export const layoutBuilder = {
  build(preflight: ESLint.Plugin): Linter.Config[] {
    return [
      {
        name: 'preflight/layout',
        files: ['**/*.ts', '**/*.tsx'],
        plugins: { preflight },
        languageOptions: {
          parser: tsParser as Linter.Parser,
        },
        rules: {
          'preflight/module-layout': 'error',
          'preflight/test-location': 'error',
          'preflight/test-file-naming': 'error',
          'preflight/max-directory-entries': 'error',
        },
      },
    ];
  },
};
