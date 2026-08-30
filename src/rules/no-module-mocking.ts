import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';
import { analysis } from '../analysis.js';

const mockMethods = new Set(['doMock', 'mock', 'unstable_mockModule']);
const frameworks = new Map([
  ['vi', 'vitest'],
  ['jest', '@jest/globals'],
]);

/**
 * Module mocking replaces a dependency by rewriting the module graph, so the
 * test proves nothing about the seam the production code actually uses. Ported
 * from the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-module-mocking',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Vitest and Jest module mocking; tests must replace dependencies through real interfaces',
    },
    messages: {
      moduleMock:
        'Replace module mocking with dependency injection through a real interface, service layer, or faithful test implementation.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    /**
     * Is this scope definition `import { <name> } from '<source>'`? Checking the
     * definition's node shape rather than its `DefinitionType` keeps the rule off
     * `@typescript-eslint/scope-manager`, which is not a declared dependency.
     */
    function isImportOf(
      definition: TSESTree.Node,
      name: string,
      source: string,
    ): boolean {
      if (
        definition.type !== AST_NODE_TYPES.ImportSpecifier ||
        definition.parent.type !== AST_NODE_TYPES.ImportDeclaration ||
        definition.parent.source.value !== source
      ) {
        return false;
      }
      const imported = definition.imported;
      return (
        (imported.type === AST_NODE_TYPES.Identifier
          ? imported.name
          : imported.value) === name
      );
    }

    /**
     * Is `node` the `vi` or `jest` object? A definition-free binding is the
     * framework global, which must be named `vi` or `jest`. An imported binding
     * is matched on the name it was imported *as*, so a local alias — `import
     * { vi as testApi }` — still resolves to the framework object.
     */
    function isFrameworkObject(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.Identifier) return false;

      const variable = analysis.resolveVariable(context.sourceCode, node);
      if (variable === null || variable.defs.length === 0) {
        return frameworks.has(node.name);
      }

      return variable.defs.some((definition) =>
        [...frameworks].some(([name, source]) =>
          isImportOf(definition.node, name, source),
        ),
      );
    }

    return {
      CallExpression(node: TSESTree.CallExpression): void {
        const callee = node.callee;
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          !isFrameworkObject(callee.object)
        ) {
          return;
        }
        const method = analysis.staticMemberName(callee);
        if (method === null || !mockMethods.has(method)) return;
        context.report({ node, messageId: 'moduleMock' });
      },
    };
  },
});
