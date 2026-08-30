import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

type TypeAssertion = TSESTree.TSAsExpression | TSESTree.TSTypeAssertion;

const safetyComment = /\bSAFETY\s*:/u;

const commentOwners = new Set<string>([
  AST_NODE_TYPES.ExpressionStatement,
  AST_NODE_TYPES.PropertyDefinition,
  AST_NODE_TYPES.ReturnStatement,
  AST_NODE_TYPES.ThrowStatement,
  AST_NODE_TYPES.VariableDeclaration,
]);

/**
 * A type assertion claims an invariant the compiler cannot verify, so the
 * invariant has to be written down. The comment may sit on the assertion itself
 * or on the statement containing it; the search climbs no further than that
 * statement. `as const` is exempt — it asserts nothing about external evidence.
 * Ported from the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'require-safety-comment-for-type-assertion',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require a nearby `SAFETY:` comment for every type assertion except const assertions',
    },
    messages: {
      missingSafetyComment:
        'This type assertion has no `SAFETY:` justification. State the checked invariant immediately before the assertion or its containing statement.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function isConstAssertion(node: TypeAssertion): boolean {
      const annotation = node.typeAnnotation;
      return (
        annotation.type === AST_NODE_TYPES.TSTypeReference &&
        annotation.typeName.type === AST_NODE_TYPES.Identifier &&
        annotation.typeName.name === 'const'
      );
    }

    function hasSafetyComment(node: TypeAssertion): boolean {
      let current: TSESTree.Node = node;
      for (;;) {
        const justified = context.sourceCode
          .getCommentsBefore(current)
          .some(
            (comment) =>
              comment.range[1] <= node.range[0] &&
              safetyComment.test(comment.value),
          );
        if (justified) return true;
        if (
          commentOwners.has(current.type) ||
          current.parent.type === AST_NODE_TYPES.Program
        ) {
          return false;
        }
        current = current.parent;
      }
    }

    function check(node: TypeAssertion): void {
      if (isConstAssertion(node) || hasSafetyComment(node)) return;
      context.report({ node, messageId: 'missingSafetyComment' });
    }

    return { TSAsExpression: check, TSTypeAssertion: check };
  },
});
