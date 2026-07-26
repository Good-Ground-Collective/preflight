import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

type FunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

export const rule = createRule({
  name: 'no-throw-helpers',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow helper functions whose entire body is a single throw statement',
    },
    messages: {
      throwHelper:
        'Avoid functions whose only job is to throw. Throw a named error class inline at the call site instead.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression)'(
        node: FunctionNode,
      ) {
        const body = node.body;
        if (!body || body.type !== 'BlockStatement') {
          return;
        }
        // Ignore stray empty statements (`;`) so they can't smuggle a
        // single-throw body past the length check.
        const statements = body.body.filter(
          (statement) => statement.type !== 'EmptyStatement',
        );
        if (statements.length === 1 && statements[0]?.type === 'ThrowStatement') {
          context.report({ node, messageId: 'throwHelper' });
        }
      },
    };
  },
});
