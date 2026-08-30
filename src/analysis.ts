import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { Scope, SourceCode } from '@typescript-eslint/utils/ts-eslint';

/**
 * Scope and member-access queries shared by more than one rule. Grouped into a
 * namespace object rather than exported as loose functions so this module obeys
 * the same `no-loose-functions` charter rule the plugin enforces on consumers.
 */
export const analysis = {
  /**
   * Walks the scope chain from `identifier` outward and returns the variable it
   * binds to, or `null` when nothing declares it.
   */
  resolveVariable(
    sourceCode: SourceCode,
    identifier: TSESTree.Identifier,
  ): Scope.Variable | null {
    let scope: Scope.Scope | null = sourceCode.getScope(identifier);
    while (scope !== null) {
      const variable = scope.set.get(identifier.name);
      if (variable !== undefined) return variable;
      scope = scope.upper;
    }
    return null;
  },

  /**
   * Reports whether `identifier` names the global binding `name` rather than a
   * local shadow. Upstream oxlint uses `sourceCode.isGlobalReference`, which
   * ESLint has no equivalent for; an unresolved name — or one resolved to a
   * variable carrying no definitions — is the global of that name.
   */
  isGlobalReference(
    sourceCode: SourceCode,
    identifier: TSESTree.Identifier,
    name: string,
  ): boolean {
    if (identifier.name !== name) return false;
    const variable = analysis.resolveVariable(sourceCode, identifier);
    return variable === null || variable.defs.length === 0;
  },

  /**
   * Resolves the property name a member expression reads, whether written with
   * dot notation (`Reflect.get`) or as a string key (`Reflect['get']`). Dynamic
   * keys carry no statically known name and resolve to `null`.
   */
  staticMemberName(node: TSESTree.MemberExpression): string | null {
    if (node.computed) {
      return node.property.type === AST_NODE_TYPES.Literal &&
        typeof node.property.value === 'string'
        ? node.property.value
        : null;
    }
    return node.property.type === AST_NODE_TYPES.Identifier
      ? node.property.name
      : null;
  },
} as const;
