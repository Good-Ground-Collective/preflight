import { ESLint } from 'eslint';
import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../../src/index.js';
import {
  typeLikeValueFilter,
  typeLikeValueSuffixes,
} from '../../src/conventions.js';

const configs = plugin.configs as Record<string, Linter.Config[]>;

/**
 * Lints a snippet through the real go-no-go config and returns only the
 * `naming-convention` messages, so unrelated charter rules firing on the
 * fixture cannot affect the assertion.
 */
const namingMessages = async (code: string): Promise<string[]> => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: configs['go-no-go'] as Linter.Config[],
  });
  const [result] = await eslint.lintText(code, { filePath: 'src/fixture.ts' });
  return (result?.messages ?? [])
    .filter(
      (message) => message.ruleId === '@typescript-eslint/naming-convention',
    )
    .map((message) => message.message);
};

const accepts = (code: string) => async () => {
  expect(await namingMessages(code)).toEqual([]);
};

const rejects = (code: string) => async () => {
  expect(await namingMessages(code)).not.toEqual([]);
};

describe('class properties are hard-scoped', () => {
  it.each([
    ['static UPPER_CASE', 'class A { static readonly MAX_RETRIES = 1; }'],
    ['instance camelCase', 'class A { retryCount = 1; }'],
    ['instance leading underscore', 'class A { private _cache = 1; }'],
  ])('accepts %s', async (_label, code) => {
    await accepts(code)();
  });

  it.each([
    ['static camelCase', 'class A { static readonly maxRetries = 1; }'],
    ['static snake_case', 'class A { static readonly max_retries = 1; }'],
    ['instance snake_case', 'class A { retry_count = 1; }'],
    ['instance UPPER_CASE', 'class A { RETRY_COUNT = 1; }'],
    ['instance PascalCase', 'class A { RetryCount = 1; }'],
  ])('rejects %s', async (_label, code) => {
    await rejects(code)();
  });

  it('rejects a snake_case parameter property', async () => {
    await rejects(
      'class A { constructor(private readonly retry_count: number) {} }',
    )();
  });

  it('accepts a camelCase parameter property', async () => {
    await accepts(
      'class A { constructor(private readonly retryCount: number) {} }',
    )();
  });
});

describe('Schema/Validator bindings may be PascalCase', () => {
  it.each([
    'const userSchema = 1;',
    'export const UserSchema = 1;',
    'const OrderValidator = 1;',
    'export const orderValidator = 1;',
  ])('accepts %s', async (code) => {
    await accepts(code)();
  });

  it('still rejects a PascalCase binding without an allowlisted suffix', async () => {
    await rejects('export const FooBar = 1;')();
  });

  it('leaves the NULL_ null-object convention intact', async () => {
    await accepts('const NULL_USER = 1;')();
  });
});

describe('object-literal keys carry external contracts', () => {
  it.each([
    ['REST client params', 'declare const o: any; o.get({ issue_number: 1 });'],
    ['HTTP headers', 'const h = { Authorization: "x", Accept: "y" };'],
    ['env var map', 'const e = { JIRA_HOST: "x", GITHUB_TOKEN: "y" };'],
    ['module mock factory', 'const m = { JiraClient: 1, Octokit: 2 };'],
    ['heading lookup table', 'const h = { Solution: "solution" };'],
    ['API response field', 'const r = { _links: 1 };'],
  ])('accepts %s', async (_label, code) => {
    await accepts(code)();
  });

  it('still rejects a key in no recognised case at all', async () => {
    await rejects('const x = { issue_Number: 1 };')();
  });

  it('does not leak the allowance to class properties', async () => {
    await rejects('class A { issue_number = 1; }')();
  });
});

describe('the PascalCase allowance tracks the loose-function allowlist', () => {
  it('accepts a PascalCase binding for every built-in suffix', async () => {
    for (const suffix of typeLikeValueSuffixes) {
      expect(await namingMessages(`const Order${suffix} = 1;`)).toEqual([]);
    }
  });

  it('builds the filter from that same list', () => {
    expect(typeLikeValueFilter).toBe(
      `(${typeLikeValueSuffixes.join('|')})$`,
    );
  });
});

describe('type names are unchanged', () => {
  it('accepts a PascalCase interface', async () => {
    await accepts('interface UserRecord { id: string }')();
  });

  it('rejects an I-prefixed interface', async () => {
    await rejects('interface IUserRecord { id: string }')();
  });
});
