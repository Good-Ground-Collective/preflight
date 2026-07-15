import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

/**
 * Always-active suffixes. User-supplied `allowedSuffixes` extend this list —
 * they never replace it (which is also why the defaults are merged in
 * `create()` instead of living in `defaultOptions`: `RuleCreator`'s
 * `applyDefault` replaces array options wholesale).
 */
const DEFAULT_ALLOWED_SUFFIXES = ['Schema', 'Validator'];

type Options = [{ allowedSuffixes?: string[] }];
type MessageIds = 'looseFunction' | 'looseAnonymousFunction';

/** Is `node` a direct child of `Program`, or one export wrapper away from it? */
function isModuleLevel(node: TSESTree.Node): boolean {
  const parent = node.parent;
  if (parent == null) {
    return false;
  }
  if (parent.type === AST_NODE_TYPES.Program) {
    return true;
  }
  return (
    (parent.type === AST_NODE_TYPES.ExportNamedDeclaration ||
      parent.type === AST_NODE_TYPES.ExportDefaultDeclaration) &&
    parent.parent.type === AST_NODE_TYPES.Program
  );
}

export default createRule<Options, MessageIds>({
  name: 'no-loose-functions',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow module-level (loose) functions; behavior belongs in service/class structures, with an allowlist escape hatch by name suffix',
    },
    messages: {
      looseFunction:
        "Module-level function '{{name}}' is loose. Move it into a service or class, or rename it with an allowed suffix ({{suffixes}}) if it is a validator-style declaration.",
      looseAnonymousFunction:
        'Anonymous module-level function is loose. Move it into a service or class.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedSuffixes: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Name suffixes that exempt a binding, in addition to the built-in Schema/Validator suffixes.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowedSuffixes: [] }],
  create(context, [{ allowedSuffixes = [] }]) {
    const suffixes = [...DEFAULT_ALLOWED_SUFFIXES, ...allowedSuffixes];

    function isAllowed(name: string | null): boolean {
      return name != null && suffixes.some((suffix) => name.endsWith(suffix));
    }

    function report(node: TSESTree.Node, name: string | null): void {
      if (name == null) {
        context.report({ node, messageId: 'looseAnonymousFunction' });
        return;
      }
      context.report({
        node,
        messageId: 'looseFunction',
        data: { name, suffixes: suffixes.join(', ') },
      });
    }

    function checkFunctionValuedDeclarator(
      node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
    ): void {
      const declarator = node.parent as TSESTree.VariableDeclarator;
      if (!isModuleLevel(declarator.parent)) {
        return;
      }
      // Destructuring patterns have no single binding name to police.
      if (declarator.id.type !== AST_NODE_TYPES.Identifier) {
        return;
      }
      const name = declarator.id.name;
      if (!isAllowed(name)) {
        report(declarator, name);
      }
    }

    function checkAnonymousDefaultExport(
      node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
    ): void {
      report(node, node.type === AST_NODE_TYPES.FunctionExpression ? (node.id?.name ?? null) : null);
    }

    return {
      FunctionDeclaration(node): void {
        if (!isModuleLevel(node)) {
          return;
        }
        const name = node.id?.name ?? null;
        if (!isAllowed(name)) {
          report(node, name);
        }
      },
      'VariableDeclarator > ArrowFunctionExpression': checkFunctionValuedDeclarator,
      'VariableDeclarator > FunctionExpression': checkFunctionValuedDeclarator,
      'ExportDefaultDeclaration > ArrowFunctionExpression': checkAnonymousDefaultExport,
      'ExportDefaultDeclaration > FunctionExpression': checkAnonymousDefaultExport,
    };
  },
});
