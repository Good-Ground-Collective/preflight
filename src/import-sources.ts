import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';

type SourceVisitor = (node: TSESTree.Node, specifier: string) => void;

/**
 * Finds every module specifier a file loads: static imports, re-exports,
 * dynamic `import()`, `require()` and `import x = require()`. Only string
 * specifiers are visited; a computed one has no path to judge.
 */
export const importSources = {
  listen(visit: SourceVisitor): RuleListener {
    const visitLiteral = (node: TSESTree.Node | null | undefined): void => {
      if (
        node?.type === AST_NODE_TYPES.Literal &&
        typeof node.value === 'string'
      ) {
        visit(node, node.value);
        return;
      }
      if (
        node?.type === AST_NODE_TYPES.TemplateLiteral &&
        node.expressions.length === 0 &&
        node.quasis[0]?.value.cooked != null
      ) {
        visit(node, node.quasis[0].value.cooked);
      }
    };
    return {
      ImportDeclaration(node) {
        visitLiteral(node.source);
      },
      ExportNamedDeclaration(node) {
        visitLiteral(node.source);
      },
      ExportAllDeclaration(node) {
        visitLiteral(node.source);
      },
      ImportExpression(node) {
        visitLiteral(node.source);
      },
      TSExternalModuleReference(node) {
        visitLiteral(node.expression);
      },
      CallExpression(node) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'require'
        ) {
          visitLiteral(node.arguments[0]);
        }
      },
    };
  },
} as const;
