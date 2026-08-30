import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../../src/index.js';
import * as ruleModules from '../../src/rules/index.js';

type Severity = 0 | 1 | 2;

const severityRank: Record<string | number, Severity> = {
  off: 0,
  warn: 1,
  error: 2,
  0: 0,
  1: 1,
  2: 2,
};

/** Flatten a flat-config array's rule maps; later entries win, as in ESLint. */
const flattenRules = (configs: Linter.Config[]): Map<string, Severity> => {
  const flat = new Map<string, Severity>();
  for (const config of configs) {
    for (const [key, entry] of Object.entries(config.rules ?? {})) {
      const raw = Array.isArray(entry) ? entry[0] : entry;
      flat.set(key, severityRank[raw as string | number] ?? 0);
    }
  }
  return flat;
};

const configs = plugin.configs as Record<string, Linter.Config[]>;
const goNoGo = flattenRules(configs['go-no-go']!);
const recommended = flattenRules(configs['recommended']!);

const deterministicRules = [
  'preflight/no-loose-functions',
  'preflight/no-planning-identifiers',
  'preflight/no-paragraph-comments',
  'preflight/no-throw-helpers',
  'preflight/no-switch-with-nested-if',
  'preflight/error-class-sets-name',
  // Ported from anti-slop; these decide on syntax alone, so they gate.
  'preflight/no-chained-type-assertions',
  'preflight/no-conditional-empty-object-spread',
  'preflight/no-module-mocking',
  'preflight/no-reflect-apply',
  'preflight/no-reflect-get',
  'preflight/no-unknown-type-aliases',
];

const stockGoNoGoRules = [
  '@typescript-eslint/member-ordering',
  '@typescript-eslint/naming-convention',
  'unicorn/filename-case',
];

const recommendedOnlyRules = [
  'preflight/service-shape',
  'preflight/constructor-single-props',
  '@typescript-eslint/consistent-type-imports',
  '@typescript-eslint/no-explicit-any',
  'import-x/no-default-export',
  // Ported from anti-slop; each is broad by design or resolves types
  // heuristically, so it can flag correct code and must not gate a merge.
  'preflight/no-known-value-widening',
  'preflight/no-object-parameters',
  'preflight/no-runtime-typeof',
  'preflight/no-service-constructor-imports',
  'preflight/no-shape-in-symbol-names',
  'preflight/no-unknown-parameters',
  'preflight/no-unknown-returns',
  'preflight/no-unsafe-dictionary-type',
  'preflight/no-widen-then-assert',
  'preflight/require-safety-comment-for-type-assertion',
];

describe('go-no-go contents', () => {
  it.each([...deterministicRules, ...stockGoNoGoRules])(
    'sets %s to error',
    (rule) => {
      expect(goNoGo.get(rule)).toBe(2);
    },
  );

  it('holds only deterministic rules — no recommended-only entries', () => {
    for (const rule of recommendedOnlyRules) {
      expect(goNoGo.has(rule)).toBe(false);
    }
  });
});

describe('recommended contents', () => {
  it.each(recommendedOnlyRules)('sets %s to error', (rule) => {
    expect(recommended.get(rule)).toBe(2);
  });
});

describe('recommended ⊇ go-no-go (mechanical superset)', () => {
  it('contains every go-no-go rule at equal-or-stricter severity', () => {
    const violations = [...goNoGo.entries()]
      .filter(([rule, severity]) => (recommended.get(rule) ?? 0) < severity)
      .map(
        ([rule, severity]) =>
          `${rule}: go-no-go=${severity}, recommended=${recommended.get(rule) ?? 'missing'}`,
      );
    expect(violations).toEqual([]);
  });

  it('is non-vacuous — go-no-go actually contains rules', () => {
    expect(goNoGo.size).toBeGreaterThanOrEqual(
      deterministicRules.length + stockGoNoGoRules.length,
    );
  });
});

describe('every rule ships in a config', () => {
  it('places each exported rule in go-no-go or recommended', () => {
    const shipped = new Set([...goNoGo.keys(), ...recommended.keys()]);
    const orphans = Object.keys(ruleModules)
      .map((name) => `preflight/${name}`)
      .filter((rule) => !shipped.has(rule));
    expect(orphans).toEqual([]);
  });

  it('exposes exactly the two config groups', () => {
    expect(Object.keys(configs).sort()).toEqual(['go-no-go', 'recommended']);
  });
});
