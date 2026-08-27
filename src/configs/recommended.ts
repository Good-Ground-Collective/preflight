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
          // Ported from dmmulroy/anti-slop. These are recommended-only because
          // each is broad by design or resolves types heuristically, so any of
          // them can flag code that is genuinely fine — the trade-off go-no-go
          // does not accept. See docs/rules for each rule's known trade-offs.
          'preflight/no-known-value-widening': 'error',
          'preflight/no-object-parameters': 'error',
          // A declared type predicate is the decoding boundary the rule asks
          // for, so guards are exempt; upstream defaults this off.
          'preflight/no-runtime-typeof': ['error', { allowInTypeGuards: true }],
          // Demanding a justification on *every* assertion is a policy, not a
          // defect check: it fired 45 times on preflight's own clean source, so
          // it cannot sit in a gate whose contract is never to block spuriously.
          'preflight/require-safety-comment-for-type-assertion': 'error',
          'preflight/no-service-constructor-imports': 'error',
          'preflight/no-shape-in-symbol-names': 'error',
          'preflight/no-unknown-parameters': 'error',
          'preflight/no-unknown-returns': 'error',
          'preflight/no-unsafe-dictionary-type': 'error',
          'preflight/no-widen-then-assert': 'error',
        },
      },
    ];
  },
};
