import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../../src/index.js';

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
