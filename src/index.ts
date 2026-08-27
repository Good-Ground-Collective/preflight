import { readFileSync } from 'node:fs';
import type { ESLint } from 'eslint';
import * as rules from './rules/index.js';
import { goNoGoBuilder } from './configs/go-no-go.js';
import { recommendedBuilder } from './configs/recommended.js';
import {
  antiSlopBuilder,
  antiSlopEffectBuilder,
} from './configs/anti-slop.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { name: string; version: string };

const plugin: ESLint.Plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
    namespace: 'preflight',
  },
  // TSESLint's RuleModule is runtime-compatible with ESLint core's RuleDefinition but not assignable to it.
  rules: { ...rules } as unknown as ESLint.Plugin['rules'],
  configs: {},
};

// Assigned after declaration so the configs can reference the plugin itself.
// go-no-go is built once and shared so `recommended ⊇ go-no-go` holds by identity.
const goNoGo = goNoGoBuilder.build(plugin);
Object.assign(plugin.configs!, {
  'go-no-go': goNoGo,
  recommended: recommendedBuilder.build(plugin, goNoGo),
  // Opt-in layers; deliberately not folded into recommended. See configs/anti-slop.ts.
  'anti-slop': antiSlopBuilder.build(plugin),
  'anti-slop-effect': antiSlopEffectBuilder.build(plugin),
});

// eslint-disable-next-line import-x/no-default-export -- flat-config consumers import the plugin object as the module default
export default plugin;
