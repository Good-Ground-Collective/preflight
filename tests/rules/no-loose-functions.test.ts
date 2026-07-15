import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../src/rules/no-loose-functions.js';

const ruleTester = new RuleTester();

ruleTester.run('no-loose-functions', rule, {
  valid: [
    // Non-function bindings are never flagged.
    'const userSchema = z.object({});',
    'const answer = 42;',

    // Default allowlisted suffixes cover function-valued bindings.
    'const userSchema = () => z.object({});',
    'const inputValidator = function () { return true; };',
    'export const responseSchema = () => z.object({});',

    // Functions nested in any non-Program scope are fine.
    'function outerSchema() { function helper() {} }',
    'const makeSchema = () => { const helper = () => {}; return helper; };',
    'if (condition) { function helper() {} }',
    '{ const helper = () => {}; }',
    'class Service { handler = () => {}; }',
    'class Service { method() { const helper = () => {}; } }',
    'const config = { onReady: () => {}, handler: function () {} };',

    // IIFEs are call expressions, not loose bindings.
    '(() => { const x = 1; })();',
    '(function bootstrap() {})();',

    // Destructuring patterns have no single binding name to police.
    'const { handler } = factories;',

    // Custom suffixes extend the defaults.
    {
      code: 'const routeGuard = () => {};',
      options: [{ allowedSuffixes: ['Guard'] }],
    },
    {
      code: 'function authGuard() {}',
      options: [{ allowedSuffixes: ['Guard'] }],
    },
    // Defaults remain active alongside custom suffixes.
    {
      code: 'const userSchema = () => z.object({});',
      options: [{ allowedSuffixes: ['Guard'] }],
    },
    {
      code: 'const inputValidator = () => true;',
      options: [{ allowedSuffixes: ['Guard'] }],
    },
  ],
  invalid: [
    {
      code: 'function helper() {}',
      errors: [{ messageId: 'looseFunction', data: { name: 'helper', suffixes: 'Schema, Validator' } }],
    },
    {
      code: 'const doThing = () => {};',
      errors: [{ messageId: 'looseFunction', data: { name: 'doThing', suffixes: 'Schema, Validator' } }],
    },
    {
      code: 'const doThing = function () {};',
      errors: [{ messageId: 'looseFunction', data: { name: 'doThing', suffixes: 'Schema, Validator' } }],
    },
    {
      code: 'let doThing = () => {};',
      errors: [{ messageId: 'looseFunction', data: { name: 'doThing', suffixes: 'Schema, Validator' } }],
    },
    {
      code: 'var doThing = function () {};',
      errors: [{ messageId: 'looseFunction', data: { name: 'doThing', suffixes: 'Schema, Validator' } }],
    },
    // Export wrappers are still module level.
    {
      code: 'export function helper() {}',
      errors: [{ messageId: 'looseFunction', data: { name: 'helper', suffixes: 'Schema, Validator' } }],
    },
    {
      code: 'export const doThing = () => {};',
      errors: [{ messageId: 'looseFunction', data: { name: 'doThing', suffixes: 'Schema, Validator' } }],
    },
    {
      code: 'export default function helper() {}',
      errors: [{ messageId: 'looseFunction', data: { name: 'helper', suffixes: 'Schema, Validator' } }],
    },
    // Anonymous default exports cannot carry an allowlisted suffix — flag them.
    {
      code: 'export default function () {}',
      errors: [{ messageId: 'looseAnonymousFunction' }],
    },
    {
      code: 'export default () => {};',
      errors: [{ messageId: 'looseAnonymousFunction' }],
    },
    // Suffix must match at the end of the name.
    {
      code: 'const schemaBuilder = () => {};',
      errors: [{ messageId: 'looseFunction', data: { name: 'schemaBuilder', suffixes: 'Schema, Validator' } }],
    },
    // Custom suffixes extend the defaults; everything else still errors.
    {
      code: 'const fooHelper = () => {};',
      options: [{ allowedSuffixes: ['Guard'] }],
      errors: [{ messageId: 'looseFunction', data: { name: 'fooHelper', suffixes: 'Schema, Validator, Guard' } }],
    },
    // Multiple declarators each report independently.
    {
      code: 'const first = () => {}, second = function () {};',
      errors: [
        { messageId: 'looseFunction', data: { name: 'first', suffixes: 'Schema, Validator' } },
        { messageId: 'looseFunction', data: { name: 'second', suffixes: 'Schema, Validator' } },
      ],
    },
  ],
});
