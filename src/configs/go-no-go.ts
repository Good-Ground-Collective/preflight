import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import unicorn from 'eslint-plugin-unicorn';
import type { ESLint, Linter } from 'eslint';

/**
 * Deterministic blocking gate: every rule in here is an `error`.
 * Takes the plugin object as a parameter to sidestep the self-reference TDZ.
 * Rule entries land in KAN-27.
 */
export function buildGoNoGo(preflight: ESLint.Plugin): Linter.Config[] {
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
      rules: {},
    },
  ];
}
