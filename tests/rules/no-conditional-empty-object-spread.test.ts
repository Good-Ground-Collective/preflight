import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { rule } from '../../src/rules/no-conditional-empty-object-spread.js';

const ruleTester = new RuleTester();
const error = {
  messageId: 'conditionalEmptySpread' as const,
  type: AST_NODE_TYPES.SpreadElement,
};

ruleTester.run('no-conditional-empty-object-spread', rule, {
  valid: [
    'const result = { value };',
    // An unconditional spread omits nothing.
    'const result = { ...values };',
    // A conditional that is not spread reads plainly.
    'const result = condition ? { value } : {};',
    // Both branches carry properties, so nothing is being omitted.
    'const result = { ...(condition ? { a } : { b }) };',
    // Spreading a non-conditional expression.
    'const result = { ...(condition && values) };',
    // Array spreads are a different construct entirely.
    'const result = [...(condition ? [value] : [])];',
  ],
  invalid: [
    {
      // Empty object in the alternate — the common "omit when absent" idiom.
      code: 'const result = { ...(value !== undefined ? { value } : {}) };',
      errors: [error],
    },
    {
      // Empty object in the consequent.
      code: 'const result = { ...(condition ? {} : { value }) };',
      errors: [error],
    },
    {
      // Each offending spread reports independently.
      code: 'const result = { ...(a ? { x } : {}), ...(b ? {} : { y }) };',
      errors: [error, error],
    },
  ],
});
