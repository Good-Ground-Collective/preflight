import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import rule from '../../src/rules/no-throw-helpers.js';

const ruleTester = new RuleTester();

ruleTester.run('no-throw-helpers', rule, {
  valid: [
    // Throw among other statements — not a pure throw helper.
    'function f() { log(); throw new Error(); }',
    // Expression-body arrow that does real work.
    'const g = () => doThing();',
    // Directive prologue plus throw → two statements in the body.
    "function f() { 'use strict'; throw new Error(); }",
    // Nested block wrapping the throw — first statement is a BlockStatement.
    'function f() { { throw new Error(); } }',
    // Empty body.
    'function f() {}',
    // Single non-throw statement.
    'function f() { return 1; }',
    // Overload / ambient signatures have no body (TSDeclareFunction).
    'declare function fail(message: string): never;',
    // Conditional throw is not a bare throw helper.
    'function f(x: unknown) { if (!x) throw new Error(); }',
  ],
  invalid: [
    {
      code: 'function fail() { throw new AppError(); }',
      errors: [
        {
          messageId: 'throwHelper',
          type: AST_NODE_TYPES.FunctionDeclaration,
          line: 1,
          column: 1,
        },
      ],
    },
    {
      code: "const boom = () => { throw new Error('x'); };",
      errors: [
        {
          messageId: 'throwHelper',
          type: AST_NODE_TYPES.ArrowFunctionExpression,
          line: 1,
          column: 14,
        },
      ],
    },
    {
      code: 'const fail = function () { throw new Error(); };',
      errors: [
        {
          messageId: 'throwHelper',
          type: AST_NODE_TYPES.FunctionExpression,
          line: 1,
          column: 14,
        },
      ],
    },
    {
      // Object method — a FunctionExpression value.
      code: 'const o = { m() { throw new Error(); } };',
      errors: [
        { messageId: 'throwHelper', type: AST_NODE_TYPES.FunctionExpression },
      ],
    },
    {
      // Class method (including abstract-method stubs) — intentional trade-off.
      code: 'class C { notImplemented() { throw new Error("not implemented"); } }',
      errors: [
        { messageId: 'throwHelper', type: AST_NODE_TYPES.FunctionExpression },
      ],
    },
    {
      // Getters match too.
      code: 'class C { get x() { throw new Error(); } }',
      errors: [
        { messageId: 'throwHelper', type: AST_NODE_TYPES.FunctionExpression },
      ],
    },
    {
      // Async does not change the body shape.
      code: 'async function fail() { throw new Error(); }',
      errors: [
        { messageId: 'throwHelper', type: AST_NODE_TYPES.FunctionDeclaration },
      ],
    },
    {
      // Neither do generators.
      code: 'function* fail() { throw new Error(); }',
      errors: [
        { messageId: 'throwHelper', type: AST_NODE_TYPES.FunctionDeclaration },
      ],
    },
    {
      // Throwing something other than a `new` expression still counts.
      code: 'const rethrow = (e: unknown) => { throw e; };',
      errors: [
        {
          messageId: 'throwHelper',
          type: AST_NODE_TYPES.ArrowFunctionExpression,
        },
      ],
    },
  ],
});
