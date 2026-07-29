import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import unicorn from 'eslint-plugin-unicorn';
import type { ESLint, Linter } from 'eslint';
import { typeLikeValueFilter } from '../conventions.js';

/**
 * Directory names owned by the tooling ecosystem rather than chosen by the
 * author. Renaming them breaks test discovery and module mocking, so casing
 * them is not ours to enforce.
 */
const toolingOwnedDirectories = [/^__(tests|mocks|snapshots|fixtures)__$/];

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
          // Schema/Validator bindings are type-like values, so PascalCase reads correctly; the suffixes are the ones no-loose-functions exempts.
          {
            selector: 'variable',
            modifiers: ['const'],
            filter: { regex: typeLikeValueFilter, match: true },
            format: ['camelCase', 'PascalCase'],
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
          // Class state is ours to name, so it stays hard-scoped even though object-literal keys below do not.
          {
            selector: 'classProperty',
            format: ['camelCase'],
            leadingUnderscore: 'allow',
          },
          {
            selector: 'parameterProperty',
            format: ['camelCase'],
            leadingUnderscore: 'allow',
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
          // Object keys carry wire formats (`issue_number`, `Authorization`, `JIRA_HOST`) whose casing a third party chose, so every deliberate case passes and only mixed-case typos fail.
          {
            selector: 'objectLiteralProperty',
            format: ['camelCase', 'PascalCase', 'snake_case', 'UPPER_CASE'],
            leadingUnderscore: 'allow',
          },
        ],
      },
    },
    // Plain TypeScript modules: kebab-case, the charter default.
    {
      name: 'preflight/go-no-go-filenames',
      files: ['**/*.ts'],
      plugins: { unicorn: unicorn as unknown as ESLint.Plugin },
      languageOptions: {
        parser: tsParser as Linter.Parser,
      },
      rules: {
        'unicorn/filename-case': [
          'error',
          { case: 'kebabCase', ignore: toolingOwnedDirectories },
        ],
      },
    },
    // Both cases pass because hooks, contexts and tests share the JSX extensions with components.
    {
      name: 'preflight/go-no-go-component-filenames',
      files: ['**/*.tsx', '**/*.jsx'],
      plugins: { unicorn: unicorn as unknown as ESLint.Plugin },
      languageOptions: {
        parser: tsParser as Linter.Parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules: {
        'unicorn/filename-case': [
          'error',
          {
            cases: { kebabCase: true, pascalCase: true },
            ignore: toolingOwnedDirectories,
          },
        ],
      },
    },
    ];
  },
};
