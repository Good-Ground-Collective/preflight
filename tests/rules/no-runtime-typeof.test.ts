import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { rule } from '../../src/rules/no-runtime-typeof.js';

const ruleTester = new RuleTester();
const error = {
  messageId: 'runtimeTypeof' as const,
  type: AST_NODE_TYPES.UnaryExpression,
};
const allowInTypeGuards = [{ allowInTypeGuards: true }] as const;

ruleTester.run('no-runtime-typeof', rule, {
  valid: [
    'const value = input;',
    // Other unary operators are untouched.
    'const negated = !flag;',
    {
      // A declared type guard, with the escape hatch enabled.
      code: 'function isString(value: unknown): value is string { return typeof value === "string"; }',
      options: allowInTypeGuards,
    },
    {
      // Arrow-function type guard.
      code: 'const isString = (value: unknown): value is string => typeof value === "string";',
      options: allowInTypeGuards,
    },
    {
      // An assertion predicate is a type predicate too.
      code: 'function assertString(value: unknown): asserts value is string { if (typeof value !== "string") throw new Error(); }',
      options: allowInTypeGuards,
    },
  ],
  invalid: [
    { code: 'if (typeof input === "string") use(input);', errors: [error] },
    {
      // Type guards are only exempt when the option is on; it defaults to off.
      code: 'function isString(value: unknown): value is string { return typeof value === "string"; }',
      errors: [error],
    },
    {
      // A plain return type is not a predicate, so the escape hatch does not apply.
      code: 'function parse(value: unknown): string { if (typeof value !== "string") throw new Error(); return value; }',
      options: allowInTypeGuards,
      errors: [error],
    },
    {
      // The nearest enclosing function decides: this arrow declares no predicate.
      code: 'function isString(value: unknown): value is string { const check = () => typeof value === "string"; return check(); }',
      options: allowInTypeGuards,
      errors: [error],
    },
    {
      // Top-level `typeof`, outside any function.
      code: 'const kind = typeof input;',
      options: allowInTypeGuards,
      errors: [error],
    },
  ],
});
