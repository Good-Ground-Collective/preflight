import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import unicorn from 'eslint-plugin-unicorn';
import type { ESLint, Linter } from 'eslint';

/**
 * Deterministic blocking gate: every rule in here is an `error`, and the set
 * stays free of false-positive-prone rules — a misfire must never block a
 * merge. `build` takes the plugin object as a parameter to sidestep the
 * self-reference TDZ.
 */
export const goNoGoBuilder = {
  build(preflight: ESLint.Plugin): Linter.Config[] {
    return [
    {
      name: 'preflight/go-no-go',
      files: ['**/*.ts', '**/*.tsx'],
      plugins: {
        preflight,
        '@typescript-eslint': tsPlugin as unknown as ESLint.Plugin,
        unicorn: unicorn as unknown as ESLint.Plugin,
      },
      languageOptions: {
        parser: tsParser as Linter.Parser,
      },
      rules: {
        'preflight/no-loose-functions': 'error',
        'preflight/no-planning-identifiers': 'error',
        'preflight/no-paragraph-comments': 'error',
        'preflight/no-throw-helpers': 'error',
        'preflight/no-switch-with-nested-if': 'error',
        'preflight/error-class-sets-name': 'error',
        '@typescript-eslint/member-ordering': [
          'error',
          {
            default: {
              memberTypes: [
                'signature',
                'public-instance-field',
                'protected-instance-field',
                'private-instance-field',
                'constructor',
                'public-instance-method',
                'protected-instance-method',
                'private-instance-method',
                'public-static-field',
                'protected-static-field',
                'private-static-field',
              ],
              order: 'as-written',
            },
          },
        ],
        '@typescript-eslint/naming-convention': [
          'error',
          // The filter scopes this UPPER_CASE null-object-constant entry so it doesn't swallow every variableLike name (first matching entry wins).
          {
            selector: 'variableLike',
            filter: { regex: '^(NULL_|UNKNOWN_)', match: true },
            format: ['UPPER_CASE'],
            prefix: ['NULL_', 'UNKNOWN_'],
          },
          {
            selector: 'variableLike',
            format: ['camelCase'],
            filter: { regex: '^(?!NULL_|UNKNOWN_).*', match: true },
            leadingUnderscore: 'allow',
          },
          { selector: 'typeLike', format: ['PascalCase'] },
          {
            selector: 'classProperty',
            modifiers: ['static'],
            format: ['UPPER_CASE'],
          },
          // M-3: no I-prefix on interfaces.
          {
            selector: 'interface',
            format: ['PascalCase'],
            custom: { regex: '^I[A-Z]', match: false },
          },
          // Keys that need quoting (rule ids, header names, …) are external identifiers, not ours to case.
          {
            selector: 'objectLiteralProperty',
            modifiers: ['requiresQuotes'],
            format: null,
          },
          // M-7: camelCase object-literal keys.
          { selector: 'objectLiteralProperty', format: ['camelCase'] },
        ],
        'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      },
    },
    ];
  },
};
