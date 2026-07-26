import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

const defaultBindingName = /^default[A-Z]\w*$/u;
const factoryName = /^create[A-Z]\w*$/u;

type FunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

export const rule = createRule({
  name: 'service-shape',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce the interface → class → optional singleton shape for service-shaped concepts (charter M-3)',
    },
    messages: {
      defaultLiteral:
        "Default '{{name}}' implements interface '{{interfaceName}}' with an object literal. Service-shaped concepts follow interface → class → optional singleton (M-3): declare a class implementing '{{interfaceName}}' and export an instance of it.",
      factoryLiteral:
        "Factory '{{name}}' returns {{kind}} instead of a class instance. Service-shaped concepts follow interface → class → optional singleton (M-3): return a `new` instance of a class implementing the service interface.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const localInterfaces = new Set<string>();

    /** Strips `as` / `satisfies` wrappers so the underlying expression can be classified. */
    function unwrapAssertions(expression: TSESTree.Expression): TSESTree.Expression {
      let current = expression;
      while (
        current.type === AST_NODE_TYPES.TSAsExpression ||
        current.type === AST_NODE_TYPES.TSSatisfiesExpression
      ) {
        current = current.expression;
      }
      return current;
    }

    /** Returns the interface-candidate name referenced by a written annotation, if any. */
    function referencedTypeName(typeNode: TSESTree.TypeNode | undefined): string | null {
      if (
        typeNode?.type === AST_NODE_TYPES.TSTypeReference &&
        typeNode.typeName.type === AST_NODE_TYPES.Identifier
      ) {
        return typeNode.typeName.name;
      }
      return null;
    }

    /** Collects the `return` statements belonging to `fn` itself, skipping nested functions. */
    function collectOwnReturns(fn: FunctionNode): TSESTree.ReturnStatement[] {
      const returns: TSESTree.ReturnStatement[] = [];
      const visit = (node: TSESTree.Node): void => {
        if (node.type === AST_NODE_TYPES.ReturnStatement) {
          returns.push(node);
          return;
        }
        if (
          node !== fn &&
          (node.type === AST_NODE_TYPES.FunctionDeclaration ||
            node.type === AST_NODE_TYPES.FunctionExpression ||
            node.type === AST_NODE_TYPES.ArrowFunctionExpression)
        ) {
          return; // returns inside nested functions are not the factory's returns
        }
        for (const key of Object.keys(node)) {
          if (key === 'parent') continue;
          const value = (node as unknown as Record<string, unknown>)[key];
          for (const child of Array.isArray(value) ? value : [value]) {
            if (
              child !== null &&
              typeof child === 'object' &&
              typeof (child as { type?: unknown }).type === 'string'
            ) {
              visit(child as TSESTree.Node);
            }
          }
        }
      };
      visit(fn.body);
      return returns;
    }

    function checkDefaultBinding(node: TSESTree.VariableDeclarator): void {
      if (node.id.type !== AST_NODE_TYPES.Identifier || !defaultBindingName.test(node.id.name)) {
        return;
      }
      if (!node.init) return;

      // Written type: annotation, or `as` / `satisfies` on the initializer.
      let typeName = referencedTypeName(node.id.typeAnnotation?.typeAnnotation);
      if (typeName === null) {
        let expression = node.init;
        while (
          typeName === null &&
          (expression.type === AST_NODE_TYPES.TSAsExpression ||
            expression.type === AST_NODE_TYPES.TSSatisfiesExpression)
        ) {
          typeName = referencedTypeName(expression.typeAnnotation);
          expression = expression.expression;
        }
      }
      if (typeName === null || !localInterfaces.has(typeName)) return;

      if (unwrapAssertions(node.init).type === AST_NODE_TYPES.ObjectExpression) {
        context.report({
          node: node.id,
          messageId: 'defaultLiteral',
          data: { name: node.id.name, interfaceName: typeName },
        });
      }
    }

    /**
     * Classifies a returned expression, following a same-scope identifier to its
     * initializer (`const svc = {…}; return svc;`). Returns the offending kind,
     * or null when the return looks acceptable (e.g. `new Foo()`, calls).
     */
    function offendingKind(
      expression: TSESTree.Expression,
      fn: FunctionNode,
    ): 'an object literal' | 'a function closure' | null {
      let resolved = unwrapAssertions(expression);

      if (resolved.type === AST_NODE_TYPES.Identifier) {
        const scope = context.sourceCode.getScope(resolved);
        const variable = scope.references.find(
          (reference) => reference.identifier === resolved,
        )?.resolved;
        const def = variable?.defs[0];
        // Only trace variables defined inside the factory itself.
        if (
          def?.type !== 'Variable' ||
          !def.node.init ||
          def.node.range[0] < fn.range[0] ||
          def.node.range[1] > fn.range[1]
        ) {
          return null;
        }
        resolved = unwrapAssertions(def.node.init);
      }

      if (resolved.type === AST_NODE_TYPES.ObjectExpression) return 'an object literal';
      if (
        resolved.type === AST_NODE_TYPES.ArrowFunctionExpression ||
        resolved.type === AST_NODE_TYPES.FunctionExpression
      ) {
        return 'a function closure';
      }
      return null;
    }

    function checkFactory(fn: FunctionNode, name: string): void {
      if (!factoryName.test(name)) return;

      const returned: TSESTree.Expression[] =
        fn.body.type !== AST_NODE_TYPES.BlockStatement
          ? [fn.body]
          : collectOwnReturns(fn)
              .map((statement) => statement.argument)
              .filter((argument): argument is TSESTree.Expression => argument !== null);

      for (const expression of returned) {
        const kind = offendingKind(expression, fn);
        if (kind !== null) {
          context.report({
            node: expression,
            messageId: 'factoryLiteral',
            data: { name, kind },
          });
        }
      }
    }

    return {
      Program(node): void {
        // Collect up front so interfaces declared after their use still count.
        for (const statement of node.body) {
          const declaration =
            statement.type === AST_NODE_TYPES.ExportNamedDeclaration
              ? statement.declaration
              : statement;
          if (declaration?.type === AST_NODE_TYPES.TSInterfaceDeclaration) {
            localInterfaces.add(declaration.id.name);
          }
        }
      },
      VariableDeclarator(node): void {
        checkDefaultBinding(node);
        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.init &&
          (node.init.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            node.init.type === AST_NODE_TYPES.FunctionExpression)
        ) {
          checkFactory(node.init, node.id.name);
        }
      },
      FunctionDeclaration(node): void {
        if (node.id) checkFactory(node, node.id.name);
      },
    };
  },
});
