import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';
import { typeScope } from '../type-scope.js';

/** Every construct that can carry an explicit return-type annotation. */
type ReturningNode =
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

const promiseTypes = new Set(['Promise', 'PromiseLike']);

/**
 * Returning `unknown` hands the caller a value it must re-derive meaning from,
 * which pushes parsing away from the boundary that had the evidence. Resolution
 * looks through module-level aliases, unions, and one level of `Promise`, and
 * respects type parameters that shadow an alias name.
 * Ported from the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-unknown-returns',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow functions whose explicit return contract is `unknown` or `Promise<unknown>`',
    },
    messages: {
      unknownReturn:
        'This function exposes `unknown` to its caller. Parse the value at its boundary and return a named domain type.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const aliases = new Map<string, TSESTree.TSTypeAliasDeclaration>();

    /** The alias name a type reference names, or `null` if it takes type arguments. */
    function referencedAliasName(type: TSESTree.TypeNode): string | null {
      if (
        type.type !== AST_NODE_TYPES.TSTypeReference ||
        type.typeName.type !== AST_NODE_TYPES.Identifier
      ) {
        return null;
      }
      return (type.typeArguments?.params.length ?? 0) === 0
        ? type.typeName.name
        : null;
    }

    function resolvesToUnknown(
      type: TSESTree.TypeNode,
      shadowed: ReadonlySet<string>,
      visited: Set<string>,
    ): boolean {
      if (type.type === AST_NODE_TYPES.TSUnknownKeyword) return true;
      // A union is as broad as its broadest member.
      if (type.type === AST_NODE_TYPES.TSUnionType) {
        return type.types.some((member) =>
          resolvesToUnknown(member, shadowed, visited),
        );
      }
      // `Promise<unknown>` exposes `unknown` just as plainly as `unknown` does.
      if (
        type.type === AST_NODE_TYPES.TSTypeReference &&
        type.typeName.type === AST_NODE_TYPES.Identifier &&
        promiseTypes.has(type.typeName.name)
      ) {
        const value = type.typeArguments?.params[0];
        return (
          value !== undefined && resolvesToUnknown(value, shadowed, visited)
        );
      }

      const name = referencedAliasName(type);
      if (name === null || visited.has(name) || shadowed.has(name)) return false;
      const alias = aliases.get(name);
      // A generic alias resolves per call site, so it is left alone.
      if (alias === undefined || alias.typeParameters != null) return false;
      return resolvesToUnknown(
        alias.typeAnnotation,
        shadowed,
        new Set([...visited, name]),
      );
    }

    function check(node: ReturningNode): void {
      const annotation = node.returnType;
      if (annotation == null) return;
      const shadowed = typeScope.lexicalTypeParameterNames(
        node,
        context.sourceCode.visitorKeys,
      );
      if (!resolvesToUnknown(annotation.typeAnnotation, shadowed, new Set())) {
        return;
      }
      context.report({
        node: annotation.typeAnnotation,
        messageId: 'unknownReturn',
      });
    }

    return {
      Program(node: TSESTree.Program): void {
        aliases.clear();
        for (const statement of node.body) {
          const declaration =
            statement.type === AST_NODE_TYPES.ExportNamedDeclaration
              ? statement.declaration
              : statement;
          if (declaration?.type === AST_NODE_TYPES.TSTypeAliasDeclaration) {
            aliases.set(declaration.id.name, declaration);
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
