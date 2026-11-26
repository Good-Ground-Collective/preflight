import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-comments.js';

const ruleTester = new RuleTester({
  linterOptions: { reportUnusedDisableDirectives: false },
});

ruleTester.run('no-comments', rule, {
  valid: [
    `/** Adds two numbers. */
export function add(a: number, b: number): number {
  return a + b;
}`,
    `/** A service. */
class Service {
  /** The base URL. */
  baseUrl = '';
  /** Fetches a record. */
  fetch(id: string): string {
    return id;
  }
  /** The resolved host. */
  get host(): string {
    return this.baseUrl;
  }
}`,
    `abstract class Service {
  /** Implemented per transport. */
  abstract fetch(id: string): string;
  /** Supplied by subclasses. */
  abstract readonly baseUrl: string;
}`,
    `class Service {
  constructor(
    /** Where requests go. */
    private readonly url: string,
  ) {}
}`,
    `/** A user. */
interface User {
  /** Unique id. */
  id: string;
  /** Renames the user. */
  rename(name: string): void;
  /** Extra attributes. */
  [key: string]: unknown;
}`,
    `/** A point. */
type Point = {
  /** Horizontal. */
  x: number;
};`,
    `/** Status values. */
enum Status {
  /** Accepted, not started. */
  Pending = 'pending',
}`,
    `/** Retry budget. */
const attempts = 3;`,
    `/** Retry budget. */
export const attempts = 3;`,
    `/** The default service. */
export default class Service {}`,
    `declare const build: () => void;
/** Flushes the buffer. */
declare function flush(n: number): void;`,
    `const config = {
  /** How many attempts. */
  attempts: 3,
  /** Fetches a record. */
  fetch(id: string): string {
    return id;
  },
};
export { config };`,
    `function run(): number {
  /** Local budget. */
  const budget = 3;
  return budget;
}`,
    `declare function Injectable(): ClassDecorator;
/** A decorated service. */
@Injectable()
class Service {}`,
    `declare const value: string;
// eslint-disable-next-line no-console
console.log(value);`,
    `/* eslint-disable no-console */
console.log(1);
/* eslint-enable no-console */`,
    `/* eslint no-console: "off" */
/* global window */
/* globals document */
/* exported run */
console.log(1);`,
    `const x = 1; // eslint-disable-line no-unused-vars`,
    `// @ts-expect-error deliberate
const n: number = 'x';`,
    `// @ts-ignore
const m: number = 'x';`,
    `// prettier-ignore
const matrix = [1,0,
                0,1];`,
    `/* c8 ignore next */
const a = 1;
/* v8 ignore next */
const b = 2;
/* istanbul ignore next */
const c = 3;`,
    `declare const value: string;
// SAFETY: validated above.
const id = value as unknown as number;`,
    `declare const value: string;
// SAFETY : spacing tolerated, as require-safety-comment-for-type-assertion allows.
const id = value as unknown as number;`,
    `declare const value: string;
/*
 * SAFETY: validated above.
 */
const id = value as unknown as number;`,
    `declare const value: string;
const id = /* SAFETY: validated above. */ value as unknown as number;`,
    `/// <reference types="node" />
/// <reference path="./globals.d.ts" />
const a = 1;`,
    `#!/usr/bin/env node
console.log(1);`,
    {
      code: `// raw-sql: the builder cannot express this join
const query = 'select 1';`,
      options: [{ additionalPrefixes: ['raw-sql:'] }],
    },
    {
      code: `// NOTE: kept
const query = 'select 1';`,
      options: [{ allowPrefixes: ['NOTE:'] }],
    },
  ],
  invalid: [
    {
      code: `// explains the next line
const a = 1;`,
      errors: [{ messageId: 'comment', line: 1 }],
    },
    {
      code: `const a = 1; // trailing note`,
      errors: [{ messageId: 'comment', line: 1, column: 14 }],
    },
    {
      code: `/* block narrative */
const a = 1;`,
      errors: [{ messageId: 'comment', line: 1 }],
    },
    {
      code: `// const old = 1;
const a = 1;`,
      errors: [{ messageId: 'comment', line: 1 }],
    },
    {
      code: `declare function run(): void;
function main(): void {
  /** slipping a comment through doc syntax */
  run();
}`,
      errors: [{ messageId: 'floatingDocComment', line: 3 }],
    },
    {
      code: `declare const ready: boolean;
/** floats above control flow */
if (ready) {
  void 0;
}`,
      errors: [{ messageId: 'floatingDocComment', line: 2 }],
    },
    {
      code: `const a = 1;
/** dangling at end of file */`,
      errors: [{ messageId: 'floatingDocComment', line: 2 }],
    },
    {
      code: `const value = 1;
/** documents a re-export, not a declaration */
export { value };`,
      errors: [{ messageId: 'floatingDocComment', line: 2 }],
    },
    {
      code: `declare const run: () => void;
const result = run(/** not a declaration */);`,
      errors: [{ messageId: 'floatingDocComment', line: 2 }],
    },
    {
      code: `declare const value: string;
// note — SAFETY: must lead the comment
const id = value as unknown as number;`,
      errors: [{ messageId: 'comment', line: 2 }],
    },
    {
      code: `// raw-sql: not allowed without the option
const query = 'select 1';`,
      errors: [{ messageId: 'comment', line: 1 }],
    },
    {
      code: `// @ts-expect-error replaced by the override
const n: number = 'x';`,
      options: [{ allowPrefixes: ['NOTE:'] }],
      errors: [{ messageId: 'comment', line: 1 }],
    },
    {
      code: `// TODO: tidy up
// FIXME: later
const a = 1;`,
      errors: [
        { messageId: 'comment', line: 1 },
        { messageId: 'comment', line: 2 },
      ],
    },
  ],
});
