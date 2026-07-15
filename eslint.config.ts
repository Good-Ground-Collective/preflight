import tseslint from 'typescript-eslint';
import preflight from './src/index.js';

export default tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'node_modules/'],
  },
  ...tseslint.configs.recommended,
  // Dogfood: preflight lints its own source with its recommended ruleset.
  ...(preflight.configs as Record<string, object[]>)['recommended']!,
);
