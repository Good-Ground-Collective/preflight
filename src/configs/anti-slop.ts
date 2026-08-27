import tsParser from '@typescript-eslint/parser';
import type { ESLint, Linter } from 'eslint';

/**
 * The rules ported from dmmulroy/anti-slop, as an opt-in layer.
 *
 * These are deliberately kept out of `go-no-go` and `recommended`. go-no-go's
 * contract is that a misfire must never block a merge, and several of these are
 * broad by design — `no-runtime-typeof` bans every `typeof`, `no-object-parameters`
 * bans `object` as a parameter type, `no-unknown-parameters` and
 * `no-unknown-returns` ban `unknown` at boundaries. That bluntness is the point
 * upstream, where the rules exist to reject reflexively defensive generated
 * code, but adopting them changes what an existing codebase is allowed to say.
 * Opting in is a decision for the consuming repo, not a default.
 *
 * The Effect rule ships separately in `anti-slop-effect`, since it presumes an
 * Effect service architecture that most consumers do not have.
 */
export const antiSlopBuilder = {
  build(preflight: ESLint.Plugin): Linter.Config[] {
    return [
      {
        name: 'preflight/anti-slop',
        files: ['**/*.ts', '**/*.tsx'],
        plugins: { preflight },
        languageOptions: { parser: tsParser as Linter.Parser },
        rules: {
          'preflight/no-chained-type-assertions': 'error',
          'preflight/no-conditional-empty-object-spread': 'error',
          'preflight/no-known-value-widening': 'error',
          'preflight/no-module-mocking': 'error',
          'preflight/no-object-parameters': 'error',
          'preflight/no-reflect-apply': 'error',
          'preflight/no-reflect-get': 'error',
          'preflight/no-runtime-typeof': 'error',
          'preflight/no-shape-in-symbol-names': 'error',
          'preflight/no-unknown-parameters': 'error',
          'preflight/no-unknown-returns': 'error',
          'preflight/no-unknown-type-aliases': 'error',
          'preflight/no-unsafe-dictionary-type': 'error',
          'preflight/no-widen-then-assert': 'error',
          'preflight/require-safety-comment-for-type-assertion': 'error',
        },
      },
    ];
  },
};

/** The Effect-specific anti-slop rule, for projects using Effect services. */
export const antiSlopEffectBuilder = {
  build(preflight: ESLint.Plugin): Linter.Config[] {
    return [
      {
        name: 'preflight/anti-slop-effect',
        files: ['**/*.ts', '**/*.tsx'],
        plugins: { preflight },
        languageOptions: { parser: tsParser as Linter.Parser },
        rules: { 'preflight/no-service-constructor-imports': 'error' },
      },
    ];
  },
};
