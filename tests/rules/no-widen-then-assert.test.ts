import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-widen-then-assert.js';

const ruleTester = new RuleTester();
const error = { messageId: 'widenThenAssert' as const };

ruleTester.run('no-widen-then-assert', rule, {
  valid: [
    // Widening with no later assertion loses evidence, but that is a different rule.
    "const source = { id: 'first' }; const widened: unknown = source;",
    // The value genuinely arrives as `unknown`, so the assertion is the first claim.
    'declare const input: unknown; const parsed = input as { readonly id: string };',
    // No widening step at all.
    "const source = { id: 'first' }; const parsed = source as { readonly id: string };",
    // Asserting back to another broad type recovers nothing, so there is no round trip.
    "const source = { id: 'first' }; const widened: unknown = source; const parsed = widened as object;",
    // A `let` binding can be rewritten, so its value is not known at the assertion.
    "const source = { id: 'first' }; let widened: unknown = source; const parsed = widened as { readonly id: string };",
    // A rewritten binding likewise carries no reliable evidence.
    "const source = { id: 'first' }; let widened: unknown = source; widened = fetchOther(); const parsed = widened as { readonly id: string };",
    // The widening and the assertion sit in different functions.
    "const source = { id: 'first' }; const widened: unknown = source; function read() { return widened as { readonly id: string }; }",
    // The initializer is a call, so nothing is syntactically known about it.
    'const widened: unknown = load(); const parsed = widened as { readonly id: string };',
    // `Record<string, unknown>` asserted to another broad record recovers nothing.
    "const source = { a: 1 }; const widened: Record<string, unknown> = source; const parsed = widened as Record<string, any>;",
    // An empty type literal is not definitely an object type.
    "const source = { id: 'first' }; const widened: object = source; const parsed = widened as {};",
  ],
  invalid: [
    {
      // The canonical round trip through `unknown`.
      code: "const source = { id: 'second' }; const widened: unknown = source; const parsed = widened as { readonly id: string };",
      errors: [{ ...error, data: { name: 'widened' } }],
    },
    {
      // Widened by an assertion on the initializer rather than by an annotation.
      code: "const source = { id: 'x' }; const widened = source as unknown; const parsed = widened as { readonly id: string };",
      errors: [{ ...error, data: { name: 'widened' } }],
    },
    {
      // `object` is broad, and an array type is definitely an object type.
      code: 'const source = [1, 2]; const widened: object = source; const parsed = widened as readonly number[];',
      errors: [{ ...error, data: { name: 'widened' } }],
    },
    {
      // A broad `Record` narrowed back to a concrete value type.
      code: 'const source = { a: startCommand }; const widened: Record<string, unknown> = source; const parsed = widened as Record<string, Command>;',
      errors: [{ ...error, data: { name: 'widened' } }],
    },
    {
      // The index-signature spelling of a broad record.
      code: 'const source = { a: startCommand }; const widened: { [key: string]: unknown } = source; const parsed = widened as { readonly a: Command };',
      errors: [{ ...error, data: { name: 'widened' } }],
    },
    {
      // Evidence traced through an intermediate `const`.
      code: "const source = { id: 'x' }; const alias = source; const widened: unknown = alias; const parsed = widened as { readonly id: string };",
      errors: [{ ...error, data: { name: 'widened' } }],
    },
    {
      // A literal is self-evident evidence.
      code: "const widened: unknown = 'text'; const parsed = widened as string;",
      errors: [{ ...error, data: { name: 'widened' } }],
    },
    {
      // Both halves inside the same function.
      code: "function read() { const source = { id: 'x' }; const widened: unknown = source; return widened as { readonly id: string }; }",
      errors: [{ ...error, data: { name: 'widened' } }],
    },
    {
      // The angle-bracket assertion form.
      code: "const source = { id: 'x' }; const widened: unknown = source; const parsed = <{ readonly id: string }>widened;",
      errors: [{ ...error, data: { name: 'widened' } }],
    },
    {
      // Asserting back to the exact declared type of the original evidence.
      code: 'declare const command: Command; const source: Command = command; const widened: unknown = source; const parsed = widened as Command;',
      errors: [{ ...error, data: { name: 'widened' } }],
    },
    {
      // Each later assertion on the same widened binding reports.
      code: "const source = { id: 'x' }; const widened: unknown = source; const a = widened as { readonly id: string }; const b = widened as { readonly id: string };",
      errors: [
        { ...error, data: { name: 'widened' } },
        { ...error, data: { name: 'widened' } },
      ],
    },
  ],
});
