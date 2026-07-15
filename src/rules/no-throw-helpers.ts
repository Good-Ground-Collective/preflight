import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

type FunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

export default createRule({
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
        if (
          body &&
          body.type === 'BlockStatement' &&
          body.body.length === 1 &&
          body.body[0]?.type === 'ThrowStatement'
        ) {
          context.report({ node, messageId: 'throwHelper' });
        }
      },
    };
  },
});
