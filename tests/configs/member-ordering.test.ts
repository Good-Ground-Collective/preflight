import { ESLint } from 'eslint';
import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../../src/index.js';

const configs = plugin.configs as Record<string, Linter.Config[]>;

/**
 * Lints a snippet through the real go-no-go config and returns only the
 * `member-ordering` messages, so unrelated charter rules firing on the fixture
 * cannot affect the assertion. Constructing ESLint with the shipped config also
 * validates the rule options, so an unrecognised member-type name fails here.
 */
const orderingMessages = async (code: string): Promise<string[]> => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: configs['go-no-go'] as Linter.Config[],
  });
  const [result] = await eslint.lintText(code, { filePath: 'src/fixture.ts' });
  return (result?.messages ?? [])
    .filter((message) => message.ruleId === '@typescript-eslint/member-ordering')
    .map((message) => message.message);
};

const accepts = (code: string) => async () => {
  expect(await orderingMessages(code)).toEqual([]);
};

const rejects = (code: string) => async () => {
  expect(await orderingMessages(code)).not.toEqual([]);
};

/** The ranked categories, flattened so equal-rank groups read as members. */
const rankedMemberTypes = (): string[] => {
  const block = (configs['go-no-go'] ?? []).find(
    (entry) => entry.rules?.['@typescript-eslint/member-ordering'] !== undefined,
  );
  const setting = block?.rules?.['@typescript-eslint/member-ordering'] as [
    string,
    { default: { memberTypes: (string | string[])[] } },
  ];
  return setting[1].default.memberTypes.flat();
};

/**
 * Every category in canonical order. A member type absent from `memberTypes` is
 * unranked and may sit anywhere, so this fixture is the readable statement of
 * the order and the reject cases below are what prove each rank is real.
 */
const canonicalClass = `abstract class Everything {
  [key: string]: unknown;

  public pubField = 1;
  protected protField = 2;
  private privField = 3;
  #hashField = 4;
  public abstract pubAbstractField: number;
  protected abstract protAbstractField: number;

  constructor() {}

  public get pubValue(): number { return 1; }
  public set pubValue(value: number) {}
  protected get protValue(): number { return 1; }
  protected set protValue(value: number) {}
  private get privValue(): number { return 1; }
  private set privValue(value: number) {}
  get #hashValue(): number { return 1; }
  set #hashValue(value: number) {}
  public abstract get pubAbstractValue(): number;
  public abstract set pubAbstractValue(value: number);
  protected abstract get protAbstractValue(): number;
  protected abstract set protAbstractValue(value: number);

  public pubMethod(): void {}
  protected protMethod(): void {}
  private privMethod(): void {}
  #hashMethod(): void {}
  public abstract pubAbstractMethod(): void;
  protected abstract protAbstractMethod(): void;

  public static pubStaticField = 1;
  protected static protStaticField = 2;
  private static privStaticField = 3;
  static #hashStaticField = 4;

  static {}

  public static get pubStaticValue(): number { return 1; }
  public static set pubStaticValue(value: number) {}
  protected static get protStaticValue(): number { return 1; }
  protected static set protStaticValue(value: number) {}
  private static get privStaticValue(): number { return 1; }
  private static set privStaticValue(value: number) {}
  static get #hashStaticValue(): number { return 1; }
  static set #hashStaticValue(value: number) {}

  public static pubStaticMethod(): void {}
  protected static protStaticMethod(): void {}
  private static privStaticMethod(): void {}
  static #hashStaticMethod(): void {}
}`;

describe('the canonical class order', () => {
  it('accepts every category declared in order', async () => {
    await accepts(canonicalClass)();
  });
});

describe('the gaps reported in issue #23', () => {
  it.each([
    [
      'a static method wedged between instance methods',
      'class A { public a(): void {} static s(): void {} public b(): void {} }',
    ],
    [
      'a getter after a private instance method',
      'class A { private p(): void {} get value(): number { return 1; } }',
    ],
    [
      'a setter before the constructor',
      'class A { set value(v: number) {} constructor() {} }',
    ],
    [
      'an abstract method above the concrete instance methods',
      'abstract class A { abstract m(): void; public a(): void {} }',
    ],
    [
      'a static initialization block after a static method',
      'class A { static s(): void {} static {} }',
    ],
  ])('rejects %s', async (_label, code) => {
    await rejects(code)();
  });

  it('accepts an abstract method below the concrete ones, which is the chosen rank', async () => {
    await accepts('abstract class A { private p(): void {} abstract m(): void; }')();
  });
});

describe('ES #private members are ranked', () => {
  it.each([
    ['a #private field after an instance method', 'class A { m(): void {} #f = 1; }'],
    [
      'a #private method before a public method',
      'class A { #m(): void {} public p(): void {} }',
    ],
    [
      'a #private static field after a static method',
      'class A { static s(): void {} static #f = 1; }',
    ],
  ])('rejects %s', async (_label, code) => {
    await rejects(code)();
  });
});

describe('static and abstract accessors are ranked', () => {
  it.each([
    [
      'a static getter after a static method',
      'class A { static s(): void {} static get value(): number { return 1; } }',
    ],
    [
      'an abstract getter after an instance method',
      'abstract class A { m(): void {} abstract get value(): number; }',
    ],
    [
      'an abstract field after the constructor',
      'abstract class A { constructor() {} abstract f: number; }',
    ],
  ])('rejects %s', async (_label, code) => {
    await rejects(code)();
  });
});

describe('the ranks the config already enforced', () => {
  it('still rejects a private instance method above the public ones', async () => {
    await rejects('class A { private p(): void {} public a(): void {} }')();
  });

  it('still rejects an instance field after the constructor', async () => {
    await rejects('class A { constructor() {} public f = 1; }')();
  });

  it('still accepts a service-shaped class', async () => {
    await accepts(
      `class UserService {
        private readonly cache = new Map<string, string>();
        constructor(private readonly deps: { host: string }) {}
        public get host(): string { return this.deps.host; }
        public find(id: string): string | undefined { return this.cache.get(id); }
        private key(id: string): string { return id; }
        static create(): UserService { return new UserService({ host: '' }); }
      }`,
    )();
  });
});

describe('a class index signature is ranked', () => {
  it('rejects an index signature after a field', async () => {
    await rejects('class A { public f = 1; [key: string]: unknown; }')();
  });
});

describe('the memberTypes list is complete', () => {
  it.each([
    'public-static-method',
    'protected-static-method',
    'private-static-method',
    'public-instance-get',
    'public-instance-set',
    'public-static-get',
    'public-static-set',
    'public-abstract-field',
    'public-abstract-method',
    'public-abstract-get',
    'public-abstract-set',
    'static-initialization',
    'readonly-signature',
    '#private-instance-field',
    '#private-instance-method',
    '#private-static-field',
    '#private-static-method',
  ])('ranks %s', (memberType) => {
    expect(rankedMemberTypes()).toContain(memberType);
  });

  it('ranks each category exactly once', () => {
    const ranked = rankedMemberTypes();
    expect(new Set(ranked).size).toBe(ranked.length);
  });
});
