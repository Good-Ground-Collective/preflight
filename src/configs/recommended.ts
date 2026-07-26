import tsPlugin from '@typescript-eslint/eslint-plugin';
import importX from 'eslint-plugin-import-x';
import type { ESLint, Linter } from 'eslint';
import { goNoGoBuilder } from './go-no-go.js';

/**
 * Superset of go-no-go: the same entries plus the fuzzier, recommended-only
 * rules and niceties. The superset relationship is structural — recommended
 * always starts with the go-no-go entries, and flat config's last-match-wins
 * ordering means the extras object can only add or raise rules.
 */
export const recommendedBuilder = {
  build(
    preflight: ESLint.Plugin,
    base: Linter.Config[] = goNoGoBuilder.build(preflight),
  ): Linter.Config[] {
    return [
      ...base,
      {
        name: 'preflight/recommended-extras',
        files: ['**/*.ts', '**/*.tsx'],
        plugins: {
          preflight,
          '@typescript-eslint': tsPlugin as unknown as ESLint.Plugin,
          'import-x': importX as unknown as ESLint.Plugin,
        },
        rules: {
          'preflight/service-shape': 'error',
          'preflight/constructor-single-props': 'error',
          '@typescript-eslint/consistent-type-imports': 'error',
          '@typescript-eslint/no-explicit-any': 'error',
          'import-x/no-default-export': 'error',
        },
      },
    ];
  },
};
