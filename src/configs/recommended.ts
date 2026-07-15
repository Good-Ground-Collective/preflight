import type { ESLint, Linter } from 'eslint';
import { buildGoNoGo } from './go-no-go.js';

/**
 * Superset of go-no-go: the same entries plus the fuzzier, recommended-only
 * rules. The superset relationship is structural — recommended always starts
 * with the go-no-go entries. Rule entries land in KAN-27.
 */
export function buildRecommended(
  preflight: ESLint.Plugin,
  base: Linter.Config[] = buildGoNoGo(preflight),
): Linter.Config[] {
  return [
    ...base,
    {
      name: 'preflight/recommended-extras',
      files: ['**/*.ts', '**/*.tsx'],
      plugins: { preflight },
      rules: {},
    },
  ];
}
