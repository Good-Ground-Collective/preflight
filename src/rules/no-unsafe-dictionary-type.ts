import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';
import type { TypeEnvironment } from '../dictionary-types.js';
import { dictionaryTypes } from '../dictionary-types.js';

/** Node types that stand for a TypeScript type, used when climbing to an enclosing type. */
const typeNodeKinds: ReadonlySet<string> = new Set<string>([
  AST_NODE_TYPES.TSAnyKeyword,
  AST_NODE_TYPES.TSArrayType,
  AST_NODE_TYPES.TSBigIntKeyword,
  AST_NODE_TYPES.TSBooleanKeyword,
  AST_NODE_TYPES.TSConditionalType,
  AST_NODE_TYPES.TSConstructorType,
  AST_NODE_TYPES.TSFunctionType,
  AST_NODE_TYPES.TSImportType,
  AST_NODE_TYPES.TSIndexedAccessType,
  AST_NODE_TYPES.TSInferType,
  AST_NODE_TYPES.TSIntersectionType,
  AST_NODE_TYPES.TSIntrinsicKeyword,
  AST_NODE_TYPES.TSLiteralType,
  AST_NODE_TYPES.TSMappedType,
  AST_NODE_TYPES.TSNamedTupleMember,
  AST_NODE_TYPES.TSNeverKeyword,
  AST_NODE_TYPES.TSNullKeyword,
  AST_NODE_TYPES.TSNumberKeyword,
  AST_NODE_TYPES.TSObjectKeyword,
  AST_NODE_TYPES.TSStringKeyword,
  AST_NODE_TYPES.TSSymbolKeyword,
  AST_NODE_TYPES.TSTemplateLiteralType,
  AST_NODE_TYPES.TSThisType,
  AST_NODE_TYPES.TSTupleType,
  AST_NODE_TYPES.TSTypeLiteral,
  AST_NODE_TYPES.TSTypeOperator,
  AST_NODE_TYPES.TSTypePredicate,
  AST_NODE_TYPES.TSTypeQuery,
  AST_NODE_TYPES.TSTypeReference,
  AST_NODE_TYPES.TSUndefinedKeyword,
  AST_NODE_TYPES.TSUnionType,
  AST_NODE_TYPES.TSUnknownKeyword,
  AST_NODE_TYPES.TSVoidKeyword,
]);

/**
 * A dictionary whose value type is `unknown`, `any`, `object`, `{}`, or a union
 * containing one of those gives callers no contract for what they will read
 * back out. Resolution follows aliases, `Record`, and the transparent built-in
 * wrappers, so the escape hatch is caught however far it is buried.
 *
 * Reporting is deduplicated two ways: an enclosing type that is itself an
 * unsafe dictionary suppresses the inner report, and a plain reference to an
 * alias reports at the alias declaration rather than at each use site.
 * Ported from the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-unsafe-dictionary-type',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow object-dictionary contracts whose direct value type is `unknown`, `any`, `object`, `{}`, or a union/alias containing one of those escape hatches',
    },
    messages: {
      unsafeDictionary:
        "This dictionary's {{value}} value type gives callers no concrete value contract. Use an owner/schema-derived value type; parse external payloads before insertion.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    let environment: TypeEnvironment | null = null;

    function isTypeNode(node: TSESTree.Node): node is TSESTree.TypeNode {
      return typeNodeKinds.has(node.type);
    }

    function isInsideTypeAlias(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current != null && current.type !== AST_NODE_TYPES.Program) {
        if (current.type === AST_NODE_TYPES.TSTypeAliasDeclaration) return true;
        current = current.parent;
      }
      return false;
    }

    /** A bare use of a module alias reports at the alias, not at every use site. */
    function isPlainAliasUse(
      node: TSESTree.TypeNode,
      typeEnvironment: TypeEnvironment,
    ): boolean {
      if (
        node.type !== AST_NODE_TYPES.TSTypeReference ||
        (node.typeArguments?.params.length ?? 0) > 0
      ) {
        return false;
      }
      const name = dictionaryTypes.typeReferenceName(node);
      return (
        name !== null &&
        typeEnvironment.aliases.has(name) &&
        !isInsideTypeAlias(node)
      );
    }

    function shouldReport(
      node: TSESTree.TypeNode,
      typeEnvironment: TypeEnvironment,
    ): boolean {
      if (isPlainAliasUse(node, typeEnvironment)) return false;
      if (
        dictionaryTypes.classifyUnsafeDictionary(node, typeEnvironment) === null
      ) {
        return false;
      }
      // An enclosing unsafe dictionary already covers this one.
      let current: TSESTree.Node | undefined = node.parent;
      while (current != null && current.type !== AST_NODE_TYPES.Program) {
        if (
          isTypeNode(current) &&
          dictionaryTypes.classifyUnsafeDictionary(
            current,
            typeEnvironment,
          ) !== null
        ) {
          return false;
        }
        current = current.parent;
      }
      return true;
    }

    function reportIfUnsafe(node: TSESTree.TypeNode): void {
      if (environment === null || !shouldReport(node, environment)) return;
      const unsafe = dictionaryTypes.classifyUnsafeDictionary(node, environment);
      if (unsafe === null) return;
      context.report({
        node,
        messageId: 'unsafeDictionary',
        data: { value: unsafe.unsafeValue },
      });
    }

    return {
      Program(node: TSESTree.Program): void {
        environment = dictionaryTypes.createTypeEnvironment(node);
      },
      TSTypeReference: reportIfUnsafe,
      TSTypeLiteral: reportIfUnsafe,
      TSMappedType: reportIfUnsafe,
      TSIndexSignature(node: TSESTree.TSIndexSignature): void {
        // A signature inside a type literal is covered by the literal itself.
        if (
          environment === null ||
          node.typeAnnotation == null ||
          node.parent.type === AST_NODE_TYPES.TSTypeLiteral
        ) {
          return;
        }
        const unsafe = dictionaryTypes.classifyUnsafeDictionaryValue(
          node.typeAnnotation.typeAnnotation,
          environment,
        );
        if (unsafe === null) return;
        context.report({
          node,
          messageId: 'unsafeDictionary',
          data: { value: unsafe.unsafeValue },
        });
      },
    };
  },
});
