import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

/**
 * `{ ...(cond ? { a } : {}) }` expresses "omit this key" through an empty
 * object, so the omission is invisible at the property it governs. Ported from
 * the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-conditional-empty-object-spread',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow object spreads that conditionally spread an empty object to omit fields',
    },
    messages: {
      conditionalEmptySpread:
        'This conditional spread hides property omission behind an empty object. Build the object in separate statements and add the property only when present.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function isEmptyObject(node: TSESTree.Node): boolean {
      return (
        node.type === AST_NODE_TYPES.ObjectExpression &&
        node.properties.length === 0
      );
    }

    return {
      SpreadElement(node: TSESTree.SpreadElement): void {
        if (node.parent.type !== AST_NODE_TYPES.ObjectExpression) return;
        const argument = node.argument;
        if (
          argument.type === AST_NODE_TYPES.ConditionalExpression &&
          (isEmptyObject(argument.consequent) ||
            isEmptyObject(argument.alternate))
        ) {
          context.report({ node, messageId: 'conditionalEmptySpread' });
        }
      },
    };
  },
});
