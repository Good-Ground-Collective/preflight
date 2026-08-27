import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';
import { analysis } from '../analysis.js';

/**
 * `Reflect.get` reads a property through a value-level indirection, so the read
 * escapes the property types the direct access would have checked. Ported from
 * the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-reflect-get',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow `Reflect.get`; use typed property access or parse dynamic input into a domain type',
    },
    messages: {
      reflectGet:
        'Replace `Reflect.get` with typed property access. Parse dynamic input into a named domain type before reading it.',
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
          analysis.staticMemberName(callee) !== 'get'
        ) {
          return;
        }
        context.report({ node, messageId: 'reflectGet' });
      },
    };
  },
});
