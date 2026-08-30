import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

type TypeAssertion = TSESTree.TSAsExpression | TSESTree.TSTypeAssertion;

/**
 * A chain such as `value as unknown as Target` launders one type into another
 * by way of a type the compiler cannot object to. Chains built only from
 * `as const` are exempt, since they narrow rather than launder.
 *
 * Upstream (anti-slop, MIT, dmmulroy/anti-slop) also walks `ParenthesizedExpression`
 * nodes; typescript-eslint's AST omits parentheses entirely, so `(x as A) as B`
 * arrives here already collapsed and needs no unwrapping.
 */
export const rule = createRule({
  name: 'no-chained-type-assertions',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow chained `as` and angle-bracket type assertions, including parenthesized chains',
    },
    messages: {
      chained:
        'This assertion chain discards type evidence. Keep the original precise type, or parse untrusted input at its boundary before narrowing it.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function isTypeAssertion(node: TSESTree.Node): node is TypeAssertion {
      return (
        node.type === AST_NODE_TYPES.TSAsExpression ||
        node.type === AST_NODE_TYPES.TSTypeAssertion
      );
    }

    function isConstAssertion(node: TypeAssertion): boolean {
      const annotation = node.typeAnnotation;
      return (
        annotation.type === AST_NODE_TYPES.TSTypeReference &&
        annotation.typeName.type === AST_NODE_TYPES.Identifier &&
        annotation.typeName.name === 'const'
      );
    }

    /** Only the chain's outermost assertion reports, so one chain yields one error. */
    function isOutermost(node: TypeAssertion): boolean {
      const parent = node.parent;
      return !isTypeAssertion(parent) || parent.expression !== node;
    }

    function isForbiddenChain(node: TypeAssertion): boolean {
      let assertions = 0;
      let hasNonConst = false;
      let current: TSESTree.Node = node;

      while (isTypeAssertion(current)) {
        assertions += 1;
        hasNonConst ||= !isConstAssertion(current);
        current = current.expression;
      }

      return assertions > 1 && hasNonConst;
    }

    function check(node: TypeAssertion): void {
      if (!isOutermost(node) || !isForbiddenChain(node)) return;
      context.report({ node, messageId: 'chained' });
    }

    return { TSAsExpression: check, TSTypeAssertion: check };
  },
});
