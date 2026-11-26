import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-ecmascript-private.js';

const ruleTester = new RuleTester();
const error = (name: string) => ({
  messageId: 'hashPrivate' as const,
  data: { name },
});

ruleTester.run('no-ecmascript-private', rule, {
  valid: [
    'class A { private count = 0; }',
    'class A { private run(): void {} }',
    'class A { private get value(): number { return 1; } }',
    'class A { static readonly LIMIT = 1; }',
  ],
  invalid: [
    { code: 'class A { #count = 0; }', errors: [error('count')] },
    { code: 'class A { static #count = 0; }', errors: [error('count')] },
    { code: 'class A { #run(): void {} }', errors: [error('run')] },
    {
      code: 'class A { get #value(): number { return 1; } }',
      errors: [error('value')],
    },
    { code: 'class A { accessor #value = 1; }', errors: [error('value')] },
    {
      code: 'class A { #count = 0; read(): number { return this.#count; } has(o: A): boolean { return #count in o; } }',
      errors: [error('count')],
    },
    { code: 'const A = class { #count = 0; };', errors: [error('count')] },
  ],
});
