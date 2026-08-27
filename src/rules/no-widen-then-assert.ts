import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { Scope } from '@typescript-eslint/utils/ts-eslint';
import { createRule } from '../utils.js';

type Assertion = TSESTree.TSAsExpression | TSESTree.TSTypeAssertion;
type BroadTypeKind = 'top' | 'object' | 'record';

/** What a binding was known to hold: an explicit type, or `null` for a self-evident literal. */
type KnownValueEvidence = { readonly type: TSESTree.TypeNode | null };

type WidenedBinding = {
  readonly broadKind: BroadTypeKind;
  readonly evidence: KnownValueEvidence;
  readonly declaredAt: number;
  readonly boundary: TSESTree.Node | null;
};

const functionBoundaryTypes = new Set<string>([
  AST_NODE_TYPES.ArrowFunctionExpression,
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.FunctionExpression,
  AST_NODE_TYPES.TSDeclareFunction,
  AST_NODE_TYPES.TSEmptyBodyFunctionExpression,
]);

/**
 * Catches the round trip where a value with a known type is parked in a widened
 * `const` and then asserted back to something narrow: the assertion recreates
 * evidence the widening had just thrown away, so nothing was ever checked.
 *
 * Both halves must sit in the same function, the binding must be a `const` that
 * is never rewritten, and the asserted type must be genuinely narrower than the
 * widened one — an assertion back to `unknown` is not a recovery.
 * Ported from the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-widen-then-assert',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow local `const` flows that explicitly widen a known value before asserting the widened binding to a narrower type',
    },
    messages: {
      widenThenAssert:
        'Binding "{{name}}" discards type evidence and later recreates it with an assertion. Keep the precise type from initialization through use; parse boundary input once.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    function typeReferenceName(type: TSESTree.TSTypeReference): string | null {
      return type.typeName.type === AST_NODE_TYPES.Identifier
        ? type.typeName.name
        : null;
    }

    function isUnknownOrAny(type: TSESTree.TypeNode): boolean {
      return (
        type.type === AST_NODE_TYPES.TSUnknownKeyword ||
        type.type === AST_NODE_TYPES.TSAnyKeyword
      );
    }

    function isBroadRecordKey(type: TSESTree.TypeNode): boolean {
      if (
        type.type === AST_NODE_TYPES.TSStringKeyword ||
        type.type === AST_NODE_TYPES.TSNumberKeyword ||
        type.type === AST_NODE_TYPES.TSSymbolKeyword
      ) {
        return true;
      }
      if (type.type === AST_NODE_TYPES.TSUnionType) {
        return type.types.every(isBroadRecordKey);
      }
      return (
        type.type === AST_NODE_TYPES.TSTypeReference &&
        typeReferenceName(type) === 'PropertyKey'
      );
    }

    /** `Record<string, unknown>` and its index-signature spelling. */
    function isBroadRecord(type: TSESTree.TypeNode): boolean {
      if (type.type === AST_NODE_TYPES.TSTypeReference) {
        if (typeReferenceName(type) === 'Readonly') {
          const [inner] = type.typeArguments?.params ?? [];
          return inner !== undefined && isBroadRecord(inner);
        }
        if (typeReferenceName(type) !== 'Record') return false;
        const parameters = type.typeArguments?.params ?? [];
        const [key, value] = parameters;
        return (
          parameters.length === 2 &&
          key !== undefined &&
          value !== undefined &&
          isBroadRecordKey(key) &&
          isUnknownOrAny(value)
        );
      }

      if (
        type.type !== AST_NODE_TYPES.TSTypeLiteral ||
        type.members.length !== 1
      ) {
        return false;
      }
      const [member] = type.members;
      if (
        member?.type !== AST_NODE_TYPES.TSIndexSignature ||
        member.parameters.length !== 1 ||
        member.typeAnnotation == null
      ) {
        return false;
      }
      const [parameter] = member.parameters;
      const key =
        parameter?.type === AST_NODE_TYPES.Identifier
          ? parameter.typeAnnotation?.typeAnnotation
          : undefined;
      return (
        key !== undefined &&
        isBroadRecordKey(key) &&
        isUnknownOrAny(member.typeAnnotation.typeAnnotation)
      );
    }

    function broadTypeKind(type: TSESTree.TypeNode): BroadTypeKind | null {
      if (isUnknownOrAny(type)) return 'top';
      if (type.type === AST_NODE_TYPES.TSObjectKeyword) return 'object';
      return isBroadRecord(type) ? 'record' : null;
    }

    function assertionFrom(expression: TSESTree.Expression): Assertion | null {
      return expression.type === AST_NODE_TYPES.TSAsExpression ||
        expression.type === AST_NODE_TYPES.TSTypeAssertion
        ? expression
        : null;
    }

    /** Compares two type annotations by their source text, ignoring whitespace. */
    function sameSyntax(
      left: TSESTree.TypeNode | null,
      right: TSESTree.TypeNode,
    ): boolean {
      if (left === null) return false;
      const normalize = (type: TSESTree.TypeNode): string =>
        sourceCode.getText(type).replaceAll(/\s+/gu, '');
      return normalize(left) === normalize(right);
    }

    function isDefinitelyObjectType(type: TSESTree.TypeNode): boolean {
      switch (type.type) {
        case AST_NODE_TYPES.TSArrayType:
        case AST_NODE_TYPES.TSConstructorType:
        case AST_NODE_TYPES.TSFunctionType:
        case AST_NODE_TYPES.TSMappedType:
        case AST_NODE_TYPES.TSObjectKeyword:
        case AST_NODE_TYPES.TSTupleType:
          return true;
        case AST_NODE_TYPES.TSTypeLiteral:
          return type.members.length > 0;
        case AST_NODE_TYPES.TSIntersectionType:
          return type.types.every(isDefinitelyObjectType);
        case AST_NODE_TYPES.TSTypeOperator:
          return (
            type.operator === 'readonly' &&
            type.typeAnnotation !== undefined &&
            isDefinitelyObjectType(type.typeAnnotation)
          );
        default:
          return false;
      }
    }

    function isDefinitelyNarrowerRecord(type: TSESTree.TypeNode): boolean {
      if (type.type === AST_NODE_TYPES.TSTypeLiteral) {
        return type.members.some(
          (member) => member.type !== AST_NODE_TYPES.TSIndexSignature,
        );
      }
      if (type.type !== AST_NODE_TYPES.TSTypeReference) return false;
      if (typeReferenceName(type) === 'Readonly') {
        const [inner] = type.typeArguments?.params ?? [];
        return inner !== undefined && isDefinitelyNarrowerRecord(inner);
      }
      if (typeReferenceName(type) !== 'Record') return false;
      const parameters = type.typeArguments?.params ?? [];
      const [, value] = parameters;
      return (
        parameters.length === 2 && value !== undefined && !isUnknownOrAny(value)
      );
    }

    /** The innermost function containing `node`, or `null` at module scope. */
    function functionBoundary(node: TSESTree.Node): TSESTree.Node | null {
      let current: TSESTree.Node | undefined = node.parent;
      while (current != null && current.type !== AST_NODE_TYPES.Program) {
        if (functionBoundaryTypes.has(current.type)) return current;
        current = current.parent;
      }
      return null;
    }

    /**
     * Resolves an identifier through the scope manager's own references, so the
     * result is the variable this occurrence binds to rather than whatever a
     * name lookup would find. References are matched by source range.
     */
    function resolvedVariable(
      identifier: TSESTree.Identifier,
    ): Scope.Variable | null {
      for (const scope of sourceCode.scopeManager?.scopes ?? []) {
        const reference = scope.references.find(
          (candidate) =>
            candidate.identifier.range[0] === identifier.range[0] &&
            candidate.identifier.range[1] === identifier.range[1],
        );
        if (reference !== undefined) return reference.resolved;
      }
      return null;
    }

    function declaratorOf(
      variable: Scope.Variable,
    ): TSESTree.VariableDeclarator | null {
      for (const definition of variable.defs) {
        if (definition.node.type === AST_NODE_TYPES.VariableDeclarator) {
          return definition.node;
        }
      }
      return null;
    }

    function isRewritten(variable: Scope.Variable): boolean {
      return variable.references.some(
        (reference) => reference.isWrite() && reference.init !== true,
      );
    }

    /** What is known about the type of `expression`, or `null` if nothing is. */
    function knownValueEvidence(
      expression: TSESTree.Expression,
      boundary: TSESTree.Node | null,
      visited: ReadonlySet<Scope.Variable>,
    ): KnownValueEvidence | null {
      const assertion = assertionFrom(expression);
      if (assertion !== null) {
        return broadTypeKind(assertion.typeAnnotation) !== null
          ? null
          : { type: assertion.typeAnnotation };
      }

      // These expressions carry their own type; there is no annotation to name.
      if (
        expression.type === AST_NODE_TYPES.Literal ||
        expression.type === AST_NODE_TYPES.TemplateLiteral ||
        expression.type === AST_NODE_TYPES.ArrayExpression ||
        expression.type === AST_NODE_TYPES.ArrowFunctionExpression ||
        expression.type === AST_NODE_TYPES.ClassExpression ||
        expression.type === AST_NODE_TYPES.FunctionExpression ||
        expression.type === AST_NODE_TYPES.NewExpression ||
        expression.type === AST_NODE_TYPES.ObjectExpression
      ) {
        return { type: null };
      }

      if (expression.type !== AST_NODE_TYPES.Identifier) return null;
      const variable = resolvedVariable(expression);
      if (variable === null || visited.has(variable)) return null;

      const annotated = variable.identifiers.find(
        (identifier) => identifier.typeAnnotation != null,
      );
      const annotation = annotated?.typeAnnotation?.typeAnnotation;
      if (annotation !== undefined && annotated !== undefined) {
        return functionBoundary(annotated) !== boundary ||
          broadTypeKind(annotation) !== null
          ? null
          : { type: annotation };
      }

      const declarator = declaratorOf(variable);
      if (
        declarator === null ||
        declarator.parent.type !== AST_NODE_TYPES.VariableDeclaration ||
        declarator.parent.kind !== 'const' ||
        declarator.init == null ||
        isRewritten(variable) ||
        functionBoundary(declarator) !== boundary
      ) {
        return null;
      }

      return knownValueEvidence(
        declarator.init,
        boundary,
        new Set([...visited, variable]),
      );
    }

    /** Is this variable a `const` that widened a value it already had evidence for? */
    function widenedBinding(variable: Scope.Variable): WidenedBinding | null {
      const declarator = declaratorOf(variable);
      if (
        declarator === null ||
        declarator.parent.type !== AST_NODE_TYPES.VariableDeclaration ||
        declarator.parent.kind !== 'const' ||
        declarator.id.type !== AST_NODE_TYPES.Identifier ||
        declarator.init == null ||
        isRewritten(variable)
      ) {
        return null;
      }

      const boundary = functionBoundary(declarator);
      const declaredType = declarator.id.typeAnnotation?.typeAnnotation;
      const initializerAssertion = assertionFrom(declarator.init);
      const initializerBroadKind =
        initializerAssertion === null
          ? null
          : broadTypeKind(initializerAssertion.typeAnnotation);
      const declaredBroadKind =
        declaredType === undefined ? null : broadTypeKind(declaredType);
      const broadKind = declaredBroadKind ?? initializerBroadKind;
      if (broadKind === null) return null;

      // Widening via `x as unknown` hides the evidence one level further down.
      const original =
        initializerAssertion !== null && initializerBroadKind !== null
          ? initializerAssertion.expression
          : declarator.init;
      const evidence = knownValueEvidence(
        original,
        boundary,
        new Set([variable]),
      );
      return evidence === null
        ? null
        : {
            broadKind,
            evidence,
            declaredAt: declarator.range[1],
            boundary,
          };
    }

    /** Does the assertion actually recover something narrower than the widening? */
    function assertionIsNarrower(
      broadKind: BroadTypeKind,
      evidence: KnownValueEvidence,
      asserted: TSESTree.TypeNode,
    ): boolean {
      // Asserting back to another broad type recovers nothing.
      if (broadTypeKind(asserted) !== null) return false;
      if (broadKind === 'top') return true;
      if (sameSyntax(evidence.type, asserted)) return true;
      return broadKind === 'object'
        ? isDefinitelyObjectType(asserted)
        : isDefinitelyNarrowerRecord(asserted);
    }

    function check(node: Assertion): void {
      const expression = node.expression;
      if (expression.type !== AST_NODE_TYPES.Identifier) return;
      const variable = resolvedVariable(expression);
      if (variable === null) return;
      const widened = widenedBinding(variable);
      if (
        widened === null ||
        // The assertion must come after the widening it undoes.
        node.range[0] <= widened.declaredAt ||
        functionBoundary(node) !== widened.boundary ||
        !assertionIsNarrower(
          widened.broadKind,
          widened.evidence,
          node.typeAnnotation,
        )
      ) {
        return;
      }
      context.report({
        node,
        messageId: 'widenThenAssert',
        data: { name: expression.name },
      });
    }

    return { TSAsExpression: check, TSTypeAssertion: check };
  },
});
