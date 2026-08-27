import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as rules from '../../src/rules/index.js';

const ruleNames = Object.keys(rules);

/**
 * `createRule` derives each rule's documentation URL from its name, so a rule
 * without a matching page publishes a link that 404s.
 */
describe('rule documentation', () => {
  it('has rules to check', () => {
    expect(ruleNames.length).toBeGreaterThan(0);
  });

  it.each(ruleNames)('documents %s', (name) => {
    const path = new URL(`../../docs/rules/${name}.md`, import.meta.url);
    expect(existsSync(path), `missing docs/rules/${name}.md`).toBe(true);
    expect(readFileSync(path, 'utf8')).toMatch(new RegExp(`^# ${name}\\n`, 'u'));
  });
});
