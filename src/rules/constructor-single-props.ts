import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

/**
 * Charter M-5: constructors take a single props object, never the
 * `constructor(config, deps)` split. Pure AST — TSParameterProperty entries
 * count as ordinary parameters, so `params.length` is the whole check.
 * Recommended-only; too heuristic for the blocking gate.
 */
export default createRule({
  name: 'constructor-single-props',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require constructors to take a single props object instead of multiple parameters',
    },
    messages: {
      multipleParams:
        'Constructor takes {{count}} parameters; pass a single props object instead (charter M-5).',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      'MethodDefinition[kind="constructor"]'(node: TSESTree.MethodDefinition) {
        if (node.value.params.length > 1) {
          context.report({
            node: node.value,
            messageId: 'multipleParams',
            data: { count: node.value.params.length },
          });
        }
      },
    };
  },
});
