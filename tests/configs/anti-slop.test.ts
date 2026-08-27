import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../../src/index.js';

const configs = plugin.configs as Record<string, Linter.Config[]>;

/** Rules ported from dmmulroy/anti-slop, excluding the Effect-specific one. */
const antiSlopRules = [
  'preflight/no-chained-type-assertions',
  'preflight/no-conditional-empty-object-spread',
  'preflight/no-known-value-widening',
  'preflight/no-module-mocking',
  'preflight/no-object-parameters',
  'preflight/no-reflect-apply',
  'preflight/no-reflect-get',
  'preflight/no-runtime-typeof',
  'preflight/no-shape-in-symbol-names',
  'preflight/no-unknown-parameters',
  'preflight/no-unknown-returns',
  'preflight/no-unknown-type-aliases',
  'preflight/no-unsafe-dictionary-type',
  'preflight/no-widen-then-assert',
  'preflight/require-safety-comment-for-type-assertion',
];

const ruleNamesIn = (name: string): Set<string> =>
  new Set(
    configs[name]!.flatMap((entry) => Object.keys(entry.rules ?? {})),
  );

describe('anti-slop config', () => {
  it.each(antiSlopRules)('sets %s to error', (rule) => {
    const entry = configs['anti-slop']!.find(
      (config) => config.rules?.[rule] !== undefined,
    );
    expect(entry?.rules?.[rule]).toBe('error');
  });

  it('holds exactly the ported generic rules and nothing else', () => {
    expect([...ruleNamesIn('anti-slop')].sort()).toEqual(
      [...antiSlopRules].sort(),
    );
  });

  it('registers the plugin in every entry that references its rules', () => {
    for (const entry of configs['anti-slop']!) {
      expect(entry.plugins?.['preflight']).toBe(plugin);
    }
  });
});

describe('anti-slop-effect config', () => {
  it('holds only the Effect rule, which presumes an Effect architecture', () => {
    expect([...ruleNamesIn('anti-slop-effect')]).toEqual([
      'preflight/no-service-constructor-imports',
    ]);
  });
});

describe('opt-in isolation', () => {
  it('keeps every anti-slop rule out of go-no-go and recommended', () => {
    const optIn = [
      ...antiSlopRules,
      'preflight/no-service-constructor-imports',
    ];
    const shipped = new Set([
      ...ruleNamesIn('go-no-go'),
      ...ruleNamesIn('recommended'),
    ]);
    expect(optIn.filter((rule) => shipped.has(rule))).toEqual([]);
  });
});
