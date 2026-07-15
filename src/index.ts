import { readFileSync } from 'node:fs';
import type { ESLint } from 'eslint';
import * as rules from './rules/index.js';
import { buildGoNoGo } from './configs/go-no-go.js';
import { buildRecommended } from './configs/recommended.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { name: string; version: string };

const plugin: ESLint.Plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
    namespace: 'preflight',
  },
  rules: { ...rules },
  configs: {},
};

// Assigned after declaration so the configs can reference the plugin itself.
// go-no-go is built once and shared so `recommended ⊇ go-no-go` holds by identity.
const goNoGo = buildGoNoGo(plugin);
Object.assign(plugin.configs!, {
  'go-no-go': goNoGo,
  recommended: buildRecommended(plugin, goNoGo),
});

export default plugin;
