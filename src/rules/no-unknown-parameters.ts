import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

type ParameterOwner = TSESTree.Node & { params: TSESTree.Parameter[] };

/**
 * `RestElement.argument` widens to `DestructuringPattern`, which admits a
 * `MemberExpression` that carries no annotation, so the recursive helpers below
 * accept the wider type and fall through for the members that lack one.
 */
type ParameterNode = TSESTree.Parameter | TSESTree.DestructuringPattern;

/**
 * A parameter typed `unknown` moves the decoding burden onto every caller and
 * leaves the function unable to say what it accepts. `cause` is exempt: error
 * enrichment genuinely receives values of unknown origin. Ported from the
 * anti-slop oxlint plugin (MIT, dmmulroy/anti-slop).
 */
export const rule = createRule({
  name: 'no-unknown-parameters',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow explicitly `unknown` function parameters except `cause`; decode unknown input at its I/O boundary instead',
    },
    messages: {
      unknownParameter:
        'Parameter `{{parameter}}` leaves input unparsed. Accept a named domain type; run the expected schema or parser at the I/O boundary before calling this function.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    /** Unwraps the wrappers a parameter can carry to reach its own annotation. */
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

    /** A destructured parameter has no name, so its source text stands in. */
    function nameOf(parameter: ParameterNode): string {
      if (parameter.type === AST_NODE_TYPES.TSParameterProperty) {
        return nameOf(parameter.parameter);
      }
      if (parameter.type === AST_NODE_TYPES.AssignmentPattern) {
        return nameOf(parameter.left);
      }
      if (parameter.type === AST_NODE_TYPES.RestElement) {
        return nameOf(parameter.argument);
      }
      return parameter.type === AST_NODE_TYPES.Identifier
        ? parameter.name
        : context.sourceCode
            .getText(parameter)
            .replace(/\s*:\s*unknown\s*$/u, '');
    }

    function check(node: ParameterOwner): void {
      for (const parameter of node.params) {
        const annotation = annotationOf(parameter);
        if (
          annotation?.typeAnnotation.type !== AST_NODE_TYPES.TSUnknownKeyword
        ) {
          continue;
        }
        const name = nameOf(parameter);
        if (name === 'cause') continue;
        context.report({
          node: annotation.typeAnnotation,
          messageId: 'unknownParameter',
          data: { parameter: name },
        });
      }
    }

    return {
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
