import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

type PrivateMember =
  | TSESTree.AccessorProperty
  | TSESTree.MethodDefinition
  | TSESTree.PropertyDefinition;

/**
 * ECMAScript `#private` members and TypeScript `private` both hide state; a
 * codebase that mixes them makes readers learn two visibility models. This
 * charter settles on TypeScript `private`.
 */
export const rule = createRule({
  name: 'no-ecmascript-private',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow ECMAScript `#private` class members; use TypeScript `private`',
    },
    messages: {
      hashPrivate:
        'Declare `#{{name}}` as `private {{name}}` instead of an ECMAScript `#private` member.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const check = (node: PrivateMember): void => {
      if (node.key.type !== AST_NODE_TYPES.PrivateIdentifier) return;
      context.report({
        node: node.key,
        messageId: 'hashPrivate',
        data: { name: node.key.name },
      });
    };
    return {
      AccessorProperty: check,
      MethodDefinition: check,
      PropertyDefinition: check,
    };
  },
});
