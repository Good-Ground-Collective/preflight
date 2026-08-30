import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/require-safety-comment-for-type-assertion.js';

const ruleTester = new RuleTester();
const error = { messageId: 'missingSafetyComment' as const };

ruleTester.run('require-safety-comment-for-type-assertion', rule, {
  valid: [
    // `as const` asserts nothing about external evidence.
    'const values = [1, 2] as const;',
    // The angle-bracket const assertion is equally exempt.
    "const value = <const>{ id: 'one' };",
    // A line comment on the containing statement.
    '// SAFETY: The parser established the UserId invariant.\nconst id = value as UserId;',
    // The comment may sit on the containing return statement.
    'function parse(): UserId {\n// SAFETY: Validation above established the UserId invariant.\nreturn value as UserId;\n}',
    // An inline block comment immediately before the assertion.
    'const id = /* SAFETY: Validation established the invariant. */ value as UserId;',
    // Spacing around the colon is tolerated.
    '// SAFETY : spacing is tolerated.\nconst id = value as UserId;',
    // No assertion at all.
    'const id: UserId = parseUserId(value);',
  ],
  invalid: [
    { code: 'const id = value as UserId;', errors: [error] },
    // The angle-bracket form needs the same justification.
    { code: 'const id = <UserId>value;', errors: [error] },
    // A trailing comment comes after the assertion, so it justifies nothing.
    {
      code: 'const id = value as UserId; // SAFETY: Too late.',
      errors: [error],
    },
    // A comment that is not a SAFETY note does not count.
    {
      code: '// This cast seems fine.\nconst id = value as UserId;',
      errors: [error],
    },
    // The search stops at the containing statement rather than climbing out of it.
    {
      code: '// SAFETY: covers the first statement only.\nconst first = a as A;\nconst second = b as B;',
      errors: [error],
    },
    // A non-const assertion inside an otherwise-justified statement still reports.
    {
      code: 'const pair = [value as UserId, other as OtherId];',
      errors: [error, error],
    },
  ],
});
