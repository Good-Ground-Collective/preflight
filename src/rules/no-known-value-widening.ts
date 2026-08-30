import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { Scope } from '@typescript-eslint/utils/ts-eslint';
import { createRule } from '../utils.js';
import { analysis } from '../analysis.js';
import type { TypeEnvironment, WideningTarget } from '../dictionary-types.js';
import { dictionaryTypes } from '../dictionary-types.js';

type FunctionNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

/**
 * An annotation that is broader than the value being assigned throws away
 * evidence the code already had: `const config: Record<string, unknown> = { … }`
 * knows exactly what it holds until the annotation says otherwise. The rule
 * fires only where the evidence is syntactically certain — an object or array
 * literal, a call to `new`, a literal — traced through `const` bindings that
 * are never reassigned. Ported from the anti-slop oxlint plugin (MIT,
 * dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-known-value-widening',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow syntactically established values from flowing into explicitly broad or anonymous target types that discard useful evidence',
    },
    messages: {
      widening:
        'The explicit {{target}} type on {{subject}} discards known type evidence. Keep inference, validate with `satisfies`, or use a named owner contract.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    let environment: TypeEnvironment | null = null;

    function unwrap(expression: TSESTree.Expression): TSESTree.Expression {
      let current = expression;
      while (
        current.type === AST_NODE_TYPES.TSAsExpression ||
        current.type === AST_NODE_TYPES.TSSatisfiesExpression ||
        current.type === AST_NODE_TYPES.TSTypeAssertion ||
        current.type === AST_NODE_TYPES.TSNonNullExpression
      ) {
        current = current.expression;
      }
      return current;
    }

    /** The sole `VariableDeclarator` a variable is declared by, if there is one. */
    function declaratorOf(
      variable: Scope.Variable,
    ): TSESTree.VariableDeclarator | null {
      if (variable.defs.length !== 1) return null;
      const [definition] = variable.defs;
      return definition?.node.type === AST_NODE_TYPES.VariableDeclarator
        ? definition.node
        : null;
    }

    /** A `const` binding that is never written after initialization. */
    function isStableConst(
      variable: Scope.Variable,
      declarator: TSESTree.VariableDeclarator,
    ): boolean {
      return (
        declarator.parent.type === AST_NODE_TYPES.VariableDeclaration &&
        declarator.parent.kind === 'const' &&
        variable.references.every(
          (reference) => reference.init === true || !reference.isWrite(),
        )
      );
    }

    /** Does this expression carry certain type evidence, directly or through a `const`? */
    function hasKnownEvidence(
      expression: TSESTree.Expression,
      visited: Set<Scope.Variable>,
    ): boolean {
      if (dictionaryTypes.isKnownEvidenceExpression(expression)) return true;
      const unwrapped = unwrap(expression);
      if (unwrapped.type !== AST_NODE_TYPES.Identifier) return false;
      const variable = analysis.resolveVariable(context.sourceCode, unwrapped);
      if (variable === null || visited.has(variable)) return false;
      const declarator = declaratorOf(variable);
      if (
        declarator === null ||
        declarator.init == null ||
        !isStableConst(variable, declarator)
      ) {
        return false;
      }
      visited.add(variable);
      return hasKnownEvidence(declarator.init, visited);
    }

    function targetOf(
      annotation: TSESTree.TSTypeAnnotation | undefined,
    ): WideningTarget | null {
      return annotation == null || environment === null
        ? null
        : dictionaryTypes.classifyWideningTarget(
            annotation.typeAnnotation,
            environment,
          );
    }

    function enclosingFunction(node: TSESTree.Node): FunctionNode | null {
      let current: TSESTree.Node | undefined = node.parent;
      while (current != null && current.type !== AST_NODE_TYPES.Program) {
        if (
          current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          current.type === AST_NODE_TYPES.FunctionDeclaration ||
          current.type === AST_NODE_TYPES.FunctionExpression
        ) {
          return current;
        }
        current = current.parent;
      }
      return null;
    }

    function keyName(key: TSESTree.Node): string {
      if (
        key.type === AST_NODE_TYPES.Identifier ||
        key.type === AST_NODE_TYPES.PrivateIdentifier
      ) {
        return key.name;
      }
      if (key.type === AST_NODE_TYPES.Literal) return String(key.value);
      return context.sourceCode.getText(key);
    }

    function functionName(owner: FunctionNode | null): string {
      if (owner === null) return 'anonymous function';
      if (owner.id != null) return owner.id.name;
      const parent = owner.parent;
      if (
        parent.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.id.type === AST_NODE_TYPES.Identifier
      ) {
        return parent.id.name;
      }
      if (parent.type === AST_NODE_TYPES.MethodDefinition) {
        return keyName(parent.key);
      }
      return 'anonymous function';
    }

    function isEmptyObject(expression: TSESTree.Expression): boolean {
      const unwrapped = unwrap(expression);
      return (
        unwrapped.type === AST_NODE_TYPES.ObjectExpression &&
        unwrapped.properties.length === 0
      );
    }

    function report(
      expression: TSESTree.Expression,
      destination: WideningTarget | null,
      subject: string,
    ): void {
      if (destination === null) return;
      // `const acc: Record<string, T> = {}` is an accumulator, not lost evidence.
      if (
        (destination.kind === 'open dictionary' ||
          destination.kind === 'generic container') &&
        isEmptyObject(expression)
      ) {
        return;
      }
      if (!hasKnownEvidence(expression, new Set())) return;
      context.report({
        node: expression,
        messageId: 'widening',
        data: { subject, target: destination.kind },
      });
    }

    /** An assertion inside another assertion is reported by the outer one. */
    function hasParentAssertion(node: TSESTree.Node): boolean {
      return (
        node.parent?.type === AST_NODE_TYPES.TSAsExpression ||
        node.parent?.type === AST_NODE_TYPES.TSTypeAssertion
      );
    }

    function reportAssertion(
      node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
    ): void {
      if (environment === null || hasParentAssertion(node)) return;
      report(
        node.expression,
        dictionaryTypes.classifyWideningTarget(node.typeAnnotation, environment),
        'assertion',
      );
    }

    return {
      Program(node: TSESTree.Program): void {
        environment = dictionaryTypes.createTypeEnvironment(node);
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator): void {
        if (node.init == null || node.id.type !== AST_NODE_TYPES.Identifier) {
          return;
        }
        report(
          node.init,
          targetOf(node.id.typeAnnotation),
          `binding \`${node.id.name}\``,
        );
      },
      PropertyDefinition(node: TSESTree.PropertyDefinition): void {
        if (node.value == null) return;
        report(
          node.value,
          targetOf(node.typeAnnotation),
          `property \`${keyName(node.key)}\``,
        );
      },
      AccessorProperty(node: TSESTree.AccessorProperty): void {
        if (node.value == null) return;
        report(
          node.value,
          targetOf(node.typeAnnotation),
          `property \`${keyName(node.key)}\``,
        );
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        if (
          node.operator !== '=' ||
          node.left.type !== AST_NODE_TYPES.Identifier
        ) {
          return;
        }
        const variable = analysis.resolveVariable(
          context.sourceCode,
          node.left,
        );
        if (variable === null) return;
        const declarator = declaratorOf(variable);
        if (
          declarator === null ||
          declarator.id.type !== AST_NODE_TYPES.Identifier
        ) {
          return;
        }
        report(
          node.right,
          targetOf(declarator.id.typeAnnotation),
          `binding \`${declarator.id.name}\``,
        );
      },
      ReturnStatement(node: TSESTree.ReturnStatement): void {
        if (node.argument == null) return;
        const owner = enclosingFunction(node);
        report(
          node.argument,
          targetOf(owner?.returnType),
          `return value of \`${functionName(owner)}\``,
        );
      },
      ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression): void {
        // A block body reports through its `return` statements instead.
        if (node.body.type === AST_NODE_TYPES.BlockStatement) return;
        report(
          node.body,
          targetOf(node.returnType),
          `return value of \`${functionName(node)}\``,
        );
      },
      TSAsExpression: reportAssertion,
      TSTypeAssertion: reportAssertion,
    };
  },
});
