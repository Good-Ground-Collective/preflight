import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';
import { analysis } from '../analysis.js';

/**
 * `Reflect.apply` invokes a function through a value-level indirection, so the
 * call site loses the parameter and return types the direct call would have
 * checked. Ported from the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-reflect-apply',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow `Reflect.apply`; call typed functions directly or model dynamic dispatch behind an interface',
    },
    messages: {
      reflectApply:
        'Replace `Reflect.apply` with a typed function call. Model dynamic dispatch behind a named interface.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression): void {
        const callee = node.callee;
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.object.type !== AST_NODE_TYPES.Identifier ||
          !analysis.isGlobalReference(
            context.sourceCode,
            callee.object,
            'Reflect',
          ) ||
          analysis.staticMemberName(callee) !== 'apply'
        ) {
          return;
        }
        context.report({ node, messageId: 'reflectApply' });
      },
    };
  },
});
