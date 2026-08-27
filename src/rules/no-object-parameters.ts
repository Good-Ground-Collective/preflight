import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';
import { typeScope } from '../type-scope.js';

/** Every construct that declares a parameter list. */
type ParameterOwner =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.TSCallSignatureDeclaration
  | TSESTree.TSConstructSignatureDeclaration
  | TSESTree.TSConstructorType
  | TSESTree.TSDeclareFunction
  | TSESTree.TSEmptyBodyFunctionExpression
  | TSESTree.TSFunctionType
  | TSESTree.TSMethodSignature;
type ParameterNode = TSESTree.Parameter | TSESTree.DestructuringPattern;

/**
 * `object` says a value is not a primitive and nothing else, so a parameter
 * typed that way accepts anything with a prototype. Resolution follows
 * module-level aliases, so `type Alias = object` is caught at its use sites too;
 * a type parameter of the same name shadows the alias and is left alone.
 * Ported from the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-object-parameters',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow `object` function parameters; inputs must use an owner-provided type and be parsed at their boundary',
    },
    messages: {
      objectParameter:
        'Parameter `{{parameter}}` uses the broad `object` type. Accept a named owner type; parse external input at its boundary before calling this function.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const aliases = new Map<string, TSESTree.TypeNode>();

    function annotationOf(
      parameter: ParameterNode,
    ): TSESTree.TSTypeAnnotation | undefined {
      if (parameter.type === AST_NODE_TYPES.TSParameterProperty) {
        return annotationOf(parameter.parameter);
      }
      if (parameter.type === AST_NODE_TYPES.RestElement) {
        return parameter.typeAnnotation ?? annotationOf(parameter.argument);
      }
      if (parameter.type === AST_NODE_TYPES.AssignmentPattern) {
        return parameter.typeAnnotation ?? parameter.left.typeAnnotation;
      }
      return 'typeAnnotation' in parameter ? parameter.typeAnnotation : undefined;
    }

    function nameOf(parameter: ParameterNode): string {
      return parameter.type === AST_NODE_TYPES.Identifier
        ? parameter.name
        : context.sourceCode
            .getText(parameter)
            .replace(/\s*:\s*object\s*$/u, '');
    }

    function resolvesToObject(
      type: TSESTree.TypeNode,
      shadowed: ReadonlySet<string>,
      visited: Set<string>,
    ): boolean {
      if (type.type === AST_NODE_TYPES.TSObjectKeyword) return true;
      // A union is as broad as its broadest member.
      if (type.type === AST_NODE_TYPES.TSUnionType) {
        return type.types.some((member) =>
          resolvesToObject(member, shadowed, visited),
        );
      }
      if (
        type.type !== AST_NODE_TYPES.TSTypeReference ||
        type.typeName.type !== AST_NODE_TYPES.Identifier ||
        (type.typeArguments?.params.length ?? 0) > 0
      ) {
        return false;
      }
      const name = type.typeName.name;
      if (visited.has(name) || shadowed.has(name)) return false;
      const alias = aliases.get(name);
      if (alias === undefined) return false;
      return resolvesToObject(alias, shadowed, new Set([...visited, name]));
    }

    function check(node: ParameterOwner): void {
      const shadowed = typeScope.lexicalTypeParameterNames(
        node,
        context.sourceCode.visitorKeys,
      );
      for (const parameter of node.params) {
        const annotation = annotationOf(parameter);
        if (annotation === undefined) continue;
        if (
          !resolvesToObject(annotation.typeAnnotation, shadowed, new Set())
        ) {
          continue;
        }
        context.report({
          node: annotation.typeAnnotation,
          messageId: 'objectParameter',
          data: { parameter: nameOf(parameter) },
        });
      }
    }

    return {
      Program(node: TSESTree.Program): void {
        aliases.clear();
        for (const statement of node.body) {
          const declaration =
            statement.type === AST_NODE_TYPES.ExportNamedDeclaration
              ? statement.declaration
              : statement;
          // A generic alias resolves per call site, so it is not indexed.
          if (
            declaration?.type === AST_NODE_TYPES.TSTypeAliasDeclaration &&
            declaration.typeParameters == null
          ) {
            aliases.set(declaration.id.name, declaration.typeAnnotation);
          }
        }
      },
      ArrowFunctionExpression: check,
      FunctionDeclaration: check,
      FunctionExpression: check,
      TSCallSignatureDeclaration: check,
      TSConstructSignatureDeclaration: check,
      TSConstructorType: check,
      TSDeclareFunction: check,
      TSEmptyBodyFunctionExpression: check,
      TSFunctionType: check,
      TSMethodSignature: check,
    };
  },
});
