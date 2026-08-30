import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

/**
 * A named alias for `unknown` reads like a domain type while carrying none of
 * the guarantees of one. `unknown` is allowed, but only where it is written
 * plainly — at a parsing boundary or on an error `cause` — never behind a name.
 * Resolution follows alias-to-alias chains and stops at generic aliases, whose
 * resolved type depends on arguments this rule cannot see.
 *
 * Ported from the anti-slop oxlint plugin (MIT, dmmulroy/anti-slop); its
 * `TSParenthesizedType` unwrapping is unnecessary here because typescript-eslint's
 * AST omits parentheses.
 */
export const rule = createRule({
  name: 'no-unknown-type-aliases',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow type aliases whose resolved type is `unknown`; `unknown` must remain visible at an allowed boundary',
    },
    messages: {
      unknownAlias:
        'Type alias `{{alias}}` hides `unknown`. Keep `unknown` explicit at the parsing boundary or on an allowed `cause` field; otherwise use the parsed owner type.',
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
      visited: Set<string>,
    ): boolean {
      if (type.type === AST_NODE_TYPES.TSUnknownKeyword) return true;
      const name = referencedAliasName(type);
      if (name === null || visited.has(name)) return false;
      const alias = aliases.get(name);
      // A generic alias resolves per call site, so it is left alone.
      if (alias === undefined || alias.typeParameters != null) return false;
      return resolvesToUnknown(
        alias.typeAnnotation,
        new Set([...visited, name]),
      );
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
        for (const alias of aliases.values()) {
          if (
            !resolvesToUnknown(
              alias.typeAnnotation,
              new Set([alias.id.name]),
            )
          ) {
            continue;
          }
          context.report({
            node: alias.id,
            messageId: 'unknownAlias',
            data: { alias: alias.id.name },
          });
        }
      },
    };
  },
});
