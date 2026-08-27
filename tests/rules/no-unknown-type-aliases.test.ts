import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { rule } from '../../src/rules/no-unknown-type-aliases.js';

const ruleTester = new RuleTester();
const error = {
  messageId: 'unknownAlias' as const,
  type: AST_NODE_TYPES.Identifier,
};

ruleTester.run('no-unknown-type-aliases', rule, {
  valid: [
    'type User = { readonly id: string };',
    // An alias chain that bottoms out in a real type.
    'type Alias = string; type UserId = Alias;',
    // `unknown` written plainly at a boundary is the allowed form.
    'function parse(input: unknown): User { return decode(input); }',
    // A generic alias resolves per call site, so it is left alone.
    'type Box<Value> = Value; type Alias = Box<unknown>;',
    // An alias referencing a generic alias is likewise not resolved.
    'type Wrapper<Value> = Value; type Alias = Wrapper<string>;',
    // A union containing `unknown` is not itself a bare alias for it.
    'type Alias = { readonly cause: unknown };',
    // Self-referential aliases terminate instead of looping.
    'type Alias = Alias;',
  ],
  invalid: [
    { code: 'type Alias = unknown;', errors: [error] },
    {
      // Both the source alias and the alias pointing at it report.
      code: 'type UnknownValue = unknown; type Alias = UnknownValue;',
      errors: [error, error],
    },
    {
      // Exported aliases are unwrapped from their export declaration.
      code: 'export type Alias = unknown;',
      errors: [error],
    },
    {
      // A three-link chain reports at every link.
      code: 'type A = unknown; type B = A; type C = B;',
      errors: [error, error, error],
    },
  ],
});
