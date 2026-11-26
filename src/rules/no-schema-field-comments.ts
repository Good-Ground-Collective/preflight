import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';
import { analysis } from '../analysis.js';

const objectFactories = new Set(['object', 'strictObject', 'looseObject']);
const toolDirective = /^\s*(?:eslint[\s-]|@ts-|prettier-ignore)/u;

/**
 * A comment beside a Zod field is lost the moment the schema leaves the file;
 * `.describe()` / `.meta()` travel with the schema into generated OpenAPI,
 * JSON Schema and error output.
 */
export const rule = createRule({
  name: 'no-schema-field-comments',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow comments on Zod object fields; document them with `.describe()` or `.meta()`',
    },
    messages: {
      fieldComment:
        'Move this comment onto the field with `.describe()` or `.meta()`, so it ships with the schema.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const { sourceCode } = context;

    const rootIdentifier = (node: TSESTree.Node): TSESTree.Node => {
      let current = node;
      while (
        current.type === AST_NODE_TYPES.MemberExpression ||
        current.type === AST_NODE_TYPES.CallExpression
      ) {
        current =
          current.type === AST_NODE_TYPES.MemberExpression
            ? current.object
            : current.callee;
      }
      return current;
    };

    const isZodRooted = (node: TSESTree.Node): boolean => {
      const root = rootIdentifier(node);
      return root.type === AST_NODE_TYPES.Identifier && root.name === 'z';
    };

    const isFieldMapCall = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      const method = analysis.staticMemberName(callee);
      if (method === 'extend') return isZodRooted(callee.object);
      return (
        method !== null &&
        objectFactories.has(method) &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        callee.object.name === 'z'
      );
    };

    return {
      CallExpression(node: TSESTree.CallExpression): void {
        const fields = node.arguments[0];
        if (
          fields?.type !== AST_NODE_TYPES.ObjectExpression ||
          !isFieldMapCall(node)
        ) {
          return;
        }
        const values = fields.properties.map((property) =>
          property.type === AST_NODE_TYPES.Property
            ? property.value.range
            : property.argument.range,
        );
        for (const comment of sourceCode.getCommentsInside(fields)) {
          if (toolDirective.test(comment.value)) continue;
          const insideValue = values.some(
            ([start, end]) =>
              comment.range[0] >= start && comment.range[1] <= end,
          );
          if (insideValue) continue;
          context.report({ loc: comment.loc, messageId: 'fieldComment' });
        }
      },
    };
  },
});
