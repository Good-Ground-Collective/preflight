import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-shape-in-symbol-names.js';

const ruleTester = new RuleTester();

ruleTester.run('no-shape-in-symbol-names', rule, {
  valid: [
    // Names describing what the value owns rather than how it is laid out.
    'const user = { id: 1 };',
    'type User = { readonly id: string };',
    // A name sharing only a prefix with the term is not a match.
    'const shard = 1;',
    {
      // A custom list replaces the default, so `shape` is no longer banned.
      code: 'const userShape = 1;',
      options: [{ terms: ['payload'] }],
    },
    {
      // An empty list disables the rule entirely.
      code: 'const userShape = 1;',
      options: [{ terms: [] }],
    },
  ],
  invalid: [
    {
      code: 'const userShape = { id: 1 };',
      errors: [
        {
          messageId: 'forbiddenSymbolName',
          data: { name: 'userShape', term: 'shape' },
        },
      ],
    },
    {
      // Matching is case-insensitive, so a leading-capital name still reports.
      code: 'type ShapeOfUser = { readonly id: string };',
      errors: [
        {
          messageId: 'forbiddenSymbolName',
          data: { name: 'ShapeOfUser', term: 'shape' },
        },
      ],
    },
    {
      // Private class members are covered.
      code: 'class Store { #shapeCache = new Map(); }',
      errors: [
        {
          messageId: 'forbiddenSymbolName',
          data: { name: 'shapeCache', term: 'shape' },
        },
      ],
    },
    {
      // A custom term list is honored.
      code: 'const requestPayload = 1;',
      options: [{ terms: ['payload'] }],
      errors: [
        {
          messageId: 'forbiddenSymbolName',
          data: { name: 'requestPayload', term: 'payload' },
        },
      ],
    },
    {
      // Matching is by substring, so an unrelated word containing the term
      // reports as well — an accepted trade-off, documented in the rule docs.
      code: 'const shaper = 1;',
      errors: [
        {
          messageId: 'forbiddenSymbolName',
          data: { name: 'shaper', term: 'shape' },
        },
      ],
    },
    {
      // Function parameters are identifiers too.
      code: 'function render(shape: Geometry) {}',
      errors: [
        {
          messageId: 'forbiddenSymbolName',
          data: { name: 'shape', term: 'shape' },
        },
      ],
    },
  ],
});
