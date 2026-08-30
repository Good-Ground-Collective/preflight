import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

type Options = [{ allowInTypeGuards?: boolean }];

const functionTypes = new Set<string>([
  AST_NODE_TYPES.ArrowFunctionExpression,
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.FunctionExpression,
]);

/**
 * A `typeof` check narrows a value's representation without establishing what
 * the value means, which is the reflex this rule rejects: decode external input
 * at its I/O boundary and branch on the resulting domain type instead. Ported
 * from the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule<Options, 'runtimeTypeof'>({
  name: 'no-runtime-typeof',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow runtime `typeof` checks; external values must be decoded into meaningful types at their I/O boundary',
    },
    messages: {
      runtimeTypeof:
        'A `typeof` check narrows a representation without establishing its contract. Parse input at its I/O boundary, then branch on the domain value.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTypeGuards: {
            type: 'boolean',
            description:
              'Permit `typeof` inside functions declaring a type-predicate return type.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTypeGuards: false }],
  create(context, [{ allowInTypeGuards = false }]) {
    /** Is `node` inside a function whose return type is a `value is T` predicate? */
    function isInsideTypeGuard(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current != null && current.type !== AST_NODE_TYPES.Program) {
        if (functionTypes.has(current.type)) {
          const returnType = (
            current as TSESTree.FunctionLike
          ).returnType?.typeAnnotation;
          return returnType?.type === AST_NODE_TYPES.TSTypePredicate;
        }
        current = current.parent;
      }
      return false;
    }

    return {
      UnaryExpression(node: TSESTree.UnaryExpression): void {
        if (node.operator !== 'typeof') return;
        if (allowInTypeGuards && isInsideTypeGuard(node)) return;
        context.report({ node, messageId: 'runtimeTypeof' });
      },
    };
  },
});
