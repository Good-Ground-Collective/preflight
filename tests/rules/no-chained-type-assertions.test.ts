import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-chained-type-assertions.js';

const ruleTester = new RuleTester();
const error = { messageId: 'chained' as const };

ruleTester.run('no-chained-type-assertions', rule, {
  valid: [
    // A single assertion is this rule's business only when chained.
    'const id = value as UserId;',
    'const id = <UserId>value;',
    // A chain built only from const assertions narrows rather than launders.
    'const values = [1, 2] as const as const;',
    // Assertions on unrelated sub-expressions are not a chain.
    'const pair = [a as A, b as B];',
    // Asserting the result of a call whose argument is asserted is not a chain.
    'const id = parse(value as string) as UserId;',
    // No assertion at all.
    'const id: UserId = value;',
  ],
  invalid: [
    // The canonical double assertion through `unknown`.
    { code: 'const id = value as unknown as UserId;', errors: [error] },
    // Parentheses do not change the shape; the AST collapses them.
    { code: 'const id = (value as unknown) as UserId;', errors: [error] },
    // The angle-bracket form chains identically.
    { code: 'const id = <UserId><unknown>value;', errors: [error] },
    // Mixed forms still count as one chain.
    { code: 'const id = <UserId>(value as unknown);', errors: [error] },
    // A const assertion in the chain does not excuse the non-const one.
    { code: 'const id = value as const as UserId;', errors: [error] },
    // Three links still report exactly once, at the outermost assertion.
    {
      code: 'const id = value as unknown as Intermediate as UserId;',
      errors: [error],
    },
    // Two independent chains report independently.
    {
      code: 'const a = x as unknown as A; const b = y as unknown as B;',
      errors: [error, error],
    },
  ],
});
