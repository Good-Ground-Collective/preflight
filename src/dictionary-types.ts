import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const builtIns = new Set([
  'Record',
  'Readonly',
  'Partial',
  'Required',
  'Pick',
  'Omit',
  'PropertyKey',
  'NonNullable',
]);

/** Wrappers that preserve the value type they wrap, so resolution reads through them. */
const transparentWrappers = new Set([
  'Readonly',
  'Partial',
  'Required',
  'NonNullable',
]);

type Substitutions = ReadonlyMap<string, TSESTree.TypeNode>;

type ResolvedType = {
  readonly type: TSESTree.TypeNode;
  readonly substitutions: Substitutions;
};

export type UnsafeValue = 'any' | 'empty-object' | 'object' | 'union' | 'unknown';

export type UnsafeDictionary = {
  readonly kind: 'unsafe-dictionary';
  readonly unsafeValue: UnsafeValue;
};

export type WideningTargetKind =
  | 'anonymous object'
  | 'generic container'
  | 'object'
  | 'open dictionary'
  | 'unknown';

export type WideningTarget = { readonly kind: WideningTargetKind };

/**
 * Type declarations visible at module scope, plus the built-in names this file
 * shadows. A shadowed `Record` is not TypeScript's `Record`, so the built-in
 * rules about it no longer apply.
 */
export type TypeEnvironment = {
  readonly aliases: ReadonlyMap<string, TSESTree.TSTypeAliasDeclaration>;
  readonly interfaces: ReadonlyMap<
    string,
    readonly TSESTree.TSInterfaceDeclaration[]
  >;
  readonly shadowedBuiltIns: ReadonlySet<string>;
};

/**
 * Structural classification of TypeScript type nodes, shared by
 * `no-unsafe-dictionary-type` and `no-known-value-widening`. Ported from the
 * anti-slop oxlint plugin's `shared/dictionary-types.ts` (MIT,
 * dmmulroy/anti-slop), with parenthesis nodes dropped — typescript-eslint's AST
 * omits them — and grouped into a namespace object because preflight's own
 * `no-loose-functions` rule bans module-level functions in its source. Nothing
 * here consults the type checker: aliases, interfaces, and generic
 * substitutions are resolved from the syntax of the file under lint alone.
 */
export const dictionaryTypes = {
  /** Unwraps an export wrapper to the declaration it carries. */
  declaredStatement(statement: TSESTree.Statement): TSESTree.Node | null {
    return statement.type === AST_NODE_TYPES.ExportNamedDeclaration ||
      statement.type === AST_NODE_TYPES.ExportDefaultDeclaration
      ? (statement.declaration ?? null)
      : statement;
  },

  createTypeEnvironment(program: TSESTree.Program): TypeEnvironment {
    const aliases = new Map<string, TSESTree.TSTypeAliasDeclaration>();
    const interfaces = new Map<string, TSESTree.TSInterfaceDeclaration[]>();
    const shadowedBuiltIns = new Set<string>();

    for (const statement of program.body) {
      const declaration = dictionaryTypes.declaredStatement(statement);

      if (declaration?.type === AST_NODE_TYPES.ImportDeclaration) {
        for (const specifier of declaration.specifiers) {
          if (builtIns.has(specifier.local.name)) {
            shadowedBuiltIns.add(specifier.local.name);
          }
        }
        continue;
      }

      if (declaration?.type === AST_NODE_TYPES.TSTypeAliasDeclaration) {
        const existing = aliases.get(declaration.id.name);
        // A duplicate declaration makes the name ambiguous, so it stops resolving.
        if (existing === undefined) aliases.set(declaration.id.name, declaration);
        else shadowedBuiltIns.add(declaration.id.name);
        if (builtIns.has(declaration.id.name)) {
          shadowedBuiltIns.add(declaration.id.name);
        }
        continue;
      }

      if (declaration?.type === AST_NODE_TYPES.TSInterfaceDeclaration) {
        const declarations = interfaces.get(declaration.id.name) ?? [];
        declarations.push(declaration);
        interfaces.set(declaration.id.name, declarations);
        if (builtIns.has(declaration.id.name)) {
          shadowedBuiltIns.add(declaration.id.name);
        }
        continue;
      }

      if (declaration?.type === AST_NODE_TYPES.TSEnumDeclaration) {
        if (builtIns.has(declaration.id.name)) {
          shadowedBuiltIns.add(declaration.id.name);
        }
        continue;
      }

      if (
        (declaration?.type === AST_NODE_TYPES.ClassDeclaration ||
          declaration?.type === AST_NODE_TYPES.FunctionDeclaration) &&
        declaration.id != null &&
        builtIns.has(declaration.id.name)
      ) {
        shadowedBuiltIns.add(declaration.id.name);
      }
    }

    return { aliases, interfaces, shadowedBuiltIns };
  },

  typeReferenceName(type: TSESTree.TSTypeReference): string | null {
    return type.typeName.type === AST_NODE_TYPES.Identifier
      ? type.typeName.name
      : null;
  },

  isBuiltIn(name: string, environment: TypeEnvironment): boolean {
    return builtIns.has(name) && !environment.shadowedBuiltIns.has(name);
  },

  /** `readonly T` classifies as `T` does; parentheses are absent from this AST. */
  unwrap(type: TSESTree.TypeNode): TSESTree.TypeNode {
    let current = type;
    while (
      current.type === AST_NODE_TYPES.TSTypeOperator &&
      current.operator === 'readonly' &&
      current.typeAnnotation !== undefined
    ) {
      current = current.typeAnnotation;
    }
    return current;
  },

  /** Is this a bare reference to `name` with no type arguments applied? */
  isUnappliedReferenceTo(type: TSESTree.TypeNode, name: string): boolean {
    const unwrapped = dictionaryTypes.unwrap(type);
    return (
      unwrapped.type === AST_NODE_TYPES.TSTypeReference &&
      dictionaryTypes.typeReferenceName(unwrapped) === name &&
      (unwrapped.typeArguments?.params.length ?? 0) === 0
    );
  },

  isNeverType(type: TSESTree.TypeNode): boolean {
    return (
      dictionaryTypes.unwrap(type).type === AST_NODE_TYPES.TSNeverKeyword
    );
  },

  /** `{ member?: never }` is the idiom for an object that holds nothing. */
  isEffectivelyEmptyMember(member: TSESTree.TypeElement): boolean {
    return (
      member.type === AST_NODE_TYPES.TSPropertySignature &&
      member.optional === true &&
      member.typeAnnotation != null &&
      dictionaryTypes.isNeverType(member.typeAnnotation.typeAnnotation)
    );
  },

  isEffectivelyEmptyTypeLiteral(type: TSESTree.TSTypeLiteral): boolean {
    return (
      type.members.length === 0 ||
      type.members.every(dictionaryTypes.isEffectivelyEmptyMember)
    );
  },

  isEffectivelyEmptyInterface(
    declarations: readonly TSESTree.TSInterfaceDeclaration[],
  ): boolean {
    // Merged declarations can contribute members, so only a lone one qualifies.
    if (declarations.length !== 1) return false;
    const [type] = declarations;
    return (
      type !== undefined &&
      (type.extends?.length ?? 0) === 0 &&
      (type.body.body.length === 0 ||
        type.body.body.every(dictionaryTypes.isEffectivelyEmptyMember))
    );
  },

  /** Resolves a type argument through the substitutions already in force. */
  resolvedSubstitutionArgument(
    type: TSESTree.TypeNode,
    base: Substitutions,
    resolving: ReadonlySet<string> = new Set(),
  ): TSESTree.TypeNode {
    const unwrapped = dictionaryTypes.unwrap(type);
    if (unwrapped.type !== AST_NODE_TYPES.TSTypeReference) return type;
    const name = dictionaryTypes.typeReferenceName(unwrapped);
    if (name === null || resolving.has(name)) return type;
    const substitution = base.get(name);
    if (substitution === undefined) return type;
    return dictionaryTypes.resolvedSubstitutionArgument(
      substitution,
      base,
      new Set([...resolving, name]),
    );
  },

  /** Binds an alias's type parameters to the arguments at a use site. */
  aliasSubstitution(
    alias: TSESTree.TSTypeAliasDeclaration,
    type: TSESTree.TSTypeReference,
    base: Substitutions,
  ): Substitutions | null {
    const parameters = alias.typeParameters?.params ?? [];
    const supplied = type.typeArguments?.params ?? [];
    const next = new Map(base);
    for (const [index, parameter] of parameters.entries()) {
      const argument = supplied[index] ?? parameter.default;
      // An unbound parameter leaves the alias unresolvable.
      if (argument == null) return null;
      next.set(
        parameter.name.name,
        dictionaryTypes.resolvedSubstitutionArgument(argument, next),
      );
    }
    return next;
  },

  /** Classifies a dictionary's *value* type, following aliases and wrappers. */
  unsafeDirectValue(
    type: TSESTree.TypeNode,
    environment: TypeEnvironment,
    substitutions: Substitutions,
    resolvingAliases: ReadonlySet<string>,
  ): UnsafeValue | null {
    const unwrapped = dictionaryTypes.unwrap(type);
    if (unwrapped.type === AST_NODE_TYPES.TSUnknownKeyword) return 'unknown';
    if (unwrapped.type === AST_NODE_TYPES.TSAnyKeyword) return 'any';
    if (unwrapped.type === AST_NODE_TYPES.TSObjectKeyword) return 'object';
    if (
      unwrapped.type === AST_NODE_TYPES.TSTypeLiteral &&
      dictionaryTypes.isEffectivelyEmptyTypeLiteral(unwrapped)
    ) {
      return 'empty-object';
    }

    if (unwrapped.type === AST_NODE_TYPES.TSUnionType) {
      // One unsafe member is enough to make the union unsafe.
      return unwrapped.types.some(
        (member) =>
          dictionaryTypes.unsafeDirectValue(
            member,
            environment,
            substitutions,
            resolvingAliases,
          ) !== null,
      )
        ? 'union'
        : null;
    }

    if (unwrapped.type === AST_NODE_TYPES.TSIntersectionType) {
      const members = unwrapped.types.map((member) =>
        dictionaryTypes.unsafeDirectValue(
          member,
          environment,
          substitutions,
          resolvingAliases,
        ),
      );
      // `any` poisons an intersection; otherwise every member must be unsafe.
      if (members.includes('any')) return 'any';
      return members.length > 0 && members.every((member) => member !== null)
        ? (members[0] ?? null)
        : null;
    }

    if (unwrapped.type !== AST_NODE_TYPES.TSTypeReference) return null;
    const name = dictionaryTypes.typeReferenceName(unwrapped);
    if (name === null) return null;

    if (
      transparentWrappers.has(name) &&
      dictionaryTypes.isBuiltIn(name, environment)
    ) {
      const wrapped = unwrapped.typeArguments?.params[0];
      return wrapped === undefined
        ? null
        : dictionaryTypes.unsafeDirectValue(
            wrapped,
            environment,
            substitutions,
            resolvingAliases,
          );
    }

    const substitution = substitutions.get(name);
    if (substitution !== undefined) {
      return dictionaryTypes.isUnappliedReferenceTo(substitution, name)
        ? null
        : dictionaryTypes.unsafeDirectValue(
            substitution,
            environment,
            substitutions,
            resolvingAliases,
          );
    }

    const declarations = environment.interfaces.get(name);
    if (declarations !== undefined) {
      return dictionaryTypes.isEffectivelyEmptyInterface(declarations)
        ? 'empty-object'
        : null;
    }

    const alias = environment.aliases.get(name);
    if (alias === undefined || resolvingAliases.has(name)) return null;
    const next = dictionaryTypes.aliasSubstitution(alias, unwrapped, substitutions);
    if (next === null) return null;
    return dictionaryTypes.unsafeDirectValue(
      alias.typeAnnotation,
      environment,
      next,
      new Set([...resolvingAliases, name]),
    );
  },

  /** The value types a dictionary-shaped type maps its keys to. */
  dictionaryValueTypes(
    type: TSESTree.TypeNode,
    environment: TypeEnvironment,
    substitutions: Substitutions,
    resolvingAliases: ReadonlySet<string>,
  ): readonly ResolvedType[] {
    const unwrapped = dictionaryTypes.unwrap(type);

    if (unwrapped.type === AST_NODE_TYPES.TSTypeLiteral) {
      return unwrapped.members.flatMap((member): readonly ResolvedType[] =>
        member.type === AST_NODE_TYPES.TSIndexSignature &&
        member.typeAnnotation != null
          ? [{ type: member.typeAnnotation.typeAnnotation, substitutions }]
          : [],
      );
    }

    if (unwrapped.type === AST_NODE_TYPES.TSMappedType) {
      return unwrapped.typeAnnotation == null
        ? []
        : [{ type: unwrapped.typeAnnotation, substitutions }];
    }

    if (unwrapped.type !== AST_NODE_TYPES.TSTypeReference) return [];
    const name = dictionaryTypes.typeReferenceName(unwrapped);
    if (name === null) return [];

    const substitution = substitutions.get(name);
    if (substitution !== undefined) {
      return dictionaryTypes.isUnappliedReferenceTo(substitution, name)
        ? []
        : dictionaryTypes.dictionaryValueTypes(
            substitution,
            environment,
            substitutions,
            resolvingAliases,
          );
    }

    if (
      transparentWrappers.has(name) &&
      dictionaryTypes.isBuiltIn(name, environment)
    ) {
      const wrapped = unwrapped.typeArguments?.params[0];
      return wrapped === undefined
        ? []
        : dictionaryTypes.dictionaryValueTypes(
            wrapped,
            environment,
            substitutions,
            resolvingAliases,
          );
    }

    if (name === 'Record' && dictionaryTypes.isBuiltIn(name, environment)) {
      const value = unwrapped.typeArguments?.params[1];
      return value === undefined ? [] : [{ type: value, substitutions }];
    }

    if (
      (name === 'Pick' || name === 'Omit') &&
      dictionaryTypes.isBuiltIn(name, environment)
    ) {
      const source = unwrapped.typeArguments?.params[0];
      return source === undefined
        ? []
        : dictionaryTypes.dictionaryValueTypes(
            source,
            environment,
            substitutions,
            resolvingAliases,
          );
    }

    const alias = environment.aliases.get(name);
    if (alias === undefined || resolvingAliases.has(name)) return [];
    const next = dictionaryTypes.aliasSubstitution(alias, unwrapped, substitutions);
    if (next === null) return [];
    return dictionaryTypes.dictionaryValueTypes(
      alias.typeAnnotation,
      environment,
      next,
      new Set([...resolvingAliases, name]),
    );
  },

  classifyUnsafeDictionaryValue(
    valueType: TSESTree.TypeNode,
    environment: TypeEnvironment,
  ): UnsafeDictionary | null {
    const unsafeValue = dictionaryTypes.unsafeDirectValue(
      valueType,
      environment,
      new Map(),
      new Set(),
    );
    return unsafeValue === null
      ? null
      : { kind: 'unsafe-dictionary', unsafeValue };
  },

  classifyUnsafeDictionary(
    type: TSESTree.TypeNode,
    environment: TypeEnvironment,
  ): UnsafeDictionary | null {
    const valueTypes = dictionaryTypes.dictionaryValueTypes(
      type,
      environment,
      new Map(),
      new Set(),
    );
    for (const valueType of valueTypes) {
      const unsafeValue = dictionaryTypes.unsafeDirectValue(
        valueType.type,
        environment,
        valueType.substitutions,
        new Set(),
      );
      if (unsafeValue !== null) {
        return { kind: 'unsafe-dictionary', unsafeValue };
      }
    }
    return null;
  },

  resolvesToDictionary(
    type: TSESTree.TypeNode,
    environment: TypeEnvironment,
    substitutions: Substitutions,
    resolvingAliases: ReadonlySet<string>,
  ): boolean {
    return (
      dictionaryTypes.dictionaryValueTypes(
        type,
        environment,
        substitutions,
        resolvingAliases,
      ).length > 0
    );
  },

  /** Is a mapped type's key constraint broad enough to make it an open dictionary? */
  isBroadMappedKey(
    type: TSESTree.TypeNode,
    environment: TypeEnvironment,
    substitutions: Substitutions,
  ): boolean {
    const unwrapped = dictionaryTypes.unwrap(type);
    if (
      unwrapped.type === AST_NODE_TYPES.TSStringKeyword ||
      unwrapped.type === AST_NODE_TYPES.TSNumberKeyword ||
      unwrapped.type === AST_NODE_TYPES.TSSymbolKeyword
    ) {
      return true;
    }
    if (unwrapped.type === AST_NODE_TYPES.TSUnionType) {
      return unwrapped.types.every((member) =>
        dictionaryTypes.isBroadMappedKey(member, environment, substitutions),
      );
    }
    if (unwrapped.type !== AST_NODE_TYPES.TSTypeReference) return false;
    const name = dictionaryTypes.typeReferenceName(unwrapped);
    if (name === null) return false;
    const substitution = substitutions.get(name);
    if (
      substitution !== undefined &&
      !dictionaryTypes.isUnappliedReferenceTo(substitution, name)
    ) {
      return dictionaryTypes.isBroadMappedKey(
        substitution,
        environment,
        substitutions,
      );
    }
    return name === 'PropertyKey' && dictionaryTypes.isBuiltIn(name, environment);
  },

  /** Classifies what an alias ultimately widens to, once fully resolved. */
  classifyAliasBroadTarget(
    type: TSESTree.TypeNode,
    environment: TypeEnvironment,
    substitutions: Substitutions,
    resolvingAliases: ReadonlySet<string>,
  ): WideningTarget | null {
    const unwrapped = dictionaryTypes.unwrap(type);
    if (unwrapped.type === AST_NODE_TYPES.TSUnknownKeyword) {
      return { kind: 'unknown' };
    }
    if (unwrapped.type === AST_NODE_TYPES.TSObjectKeyword) {
      return { kind: 'object' };
    }
    if (unwrapped.type === AST_NODE_TYPES.TSTypeLiteral) {
      return unwrapped.members.some(
        (member) => member.type === AST_NODE_TYPES.TSIndexSignature,
      )
        ? { kind: 'open dictionary' }
        : null;
    }
    if (unwrapped.type === AST_NODE_TYPES.TSMappedType) {
      return dictionaryTypes.isBroadMappedKey(
        unwrapped.constraint,
        environment,
        substitutions,
      )
        ? { kind: 'open dictionary' }
        : null;
    }
    if (unwrapped.type !== AST_NODE_TYPES.TSTypeReference) return null;
    const name = dictionaryTypes.typeReferenceName(unwrapped);
    if (name === null) return null;

    const substitution = substitutions.get(name);
    if (substitution !== undefined) {
      return dictionaryTypes.isUnappliedReferenceTo(substitution, name)
        ? null
        : dictionaryTypes.classifyAliasBroadTarget(
            substitution,
            environment,
            substitutions,
            resolvingAliases,
          );
    }
    if (
      transparentWrappers.has(name) &&
      dictionaryTypes.isBuiltIn(name, environment)
    ) {
      const wrapped = unwrapped.typeArguments?.params[0];
      return wrapped === undefined
        ? null
        : dictionaryTypes.classifyAliasBroadTarget(
            wrapped,
            environment,
            substitutions,
            resolvingAliases,
          );
    }
    if (name === 'Record' && dictionaryTypes.isBuiltIn(name, environment)) {
      return { kind: 'open dictionary' };
    }

    const alias = environment.aliases.get(name);
    if (alias === undefined || resolvingAliases.has(name)) return null;
    const next = dictionaryTypes.aliasSubstitution(alias, unwrapped, substitutions);
    if (next === null) return null;
    return dictionaryTypes.classifyAliasBroadTarget(
      alias.typeAnnotation,
      environment,
      next,
      new Set([...resolvingAliases, name]),
    );
  },

  /** Classifies an annotation as a widening target, or `null` if it is precise. */
  classifyWideningTarget(
    type: TSESTree.TypeNode,
    environment: TypeEnvironment,
  ): WideningTarget | null {
    const unwrapped = dictionaryTypes.unwrap(type);
    if (unwrapped.type === AST_NODE_TYPES.TSUnknownKeyword) {
      return { kind: 'unknown' };
    }
    if (unwrapped.type === AST_NODE_TYPES.TSObjectKeyword) {
      return { kind: 'object' };
    }
    if (unwrapped.type === AST_NODE_TYPES.TSTypeLiteral) {
      if (
        unwrapped.members.some(
          (member) => member.type === AST_NODE_TYPES.TSIndexSignature,
        )
      ) {
        return { kind: 'open dictionary' };
      }
      return unwrapped.members.length > 0
        ? { kind: 'anonymous object' }
        : null;
    }
    if (unwrapped.type === AST_NODE_TYPES.TSMappedType) {
      return { kind: 'open dictionary' };
    }
    if (unwrapped.type !== AST_NODE_TYPES.TSTypeReference) return null;
    const name = dictionaryTypes.typeReferenceName(unwrapped);
    if (name === null) return null;

    if (
      transparentWrappers.has(name) &&
      dictionaryTypes.isBuiltIn(name, environment)
    ) {
      const wrapped = unwrapped.typeArguments?.params[0];
      return wrapped === undefined
        ? null
        : dictionaryTypes.classifyWideningTarget(wrapped, environment);
    }
    if (name === 'Record' && dictionaryTypes.isBuiltIn(name, environment)) {
      return { kind: 'open dictionary' };
    }

    const alias = environment.aliases.get(name);
    if (alias === undefined) return null;
    const substitutions = dictionaryTypes.aliasSubstitution(
      alias,
      unwrapped,
      new Map(),
    );
    if (substitutions === null) return null;

    // A generic alias bottoming out in a dictionary is a container, not a target.
    if ((alias.typeParameters?.params.length ?? 0) > 0) {
      return dictionaryTypes.resolvesToDictionary(
        alias.typeAnnotation,
        environment,
        substitutions,
        new Set([name]),
      )
        ? { kind: 'generic container' }
        : null;
    }

    return dictionaryTypes.classifyAliasBroadTarget(
      alias.typeAnnotation,
      environment,
      substitutions,
      new Set([name]),
    );
  },

  /** Reads through assertions to the expression underneath. */
  unwrapAssertions(
    expression: TSESTree.Expression,
    includeSatisfies: boolean,
  ): TSESTree.Expression {
    let current = expression;
    while (
      current.type === AST_NODE_TYPES.TSAsExpression ||
      current.type === AST_NODE_TYPES.TSTypeAssertion ||
      current.type === AST_NODE_TYPES.TSNonNullExpression ||
      (includeSatisfies &&
        current.type === AST_NODE_TYPES.TSSatisfiesExpression)
    ) {
      current = current.expression;
    }
    return current;
  },

  isPopulatedObjectExpression(expression: TSESTree.Expression): boolean {
    const current = dictionaryTypes.unwrapAssertions(expression, false);
    return (
      current.type === AST_NODE_TYPES.ObjectExpression &&
      current.properties.length > 0
    );
  },

  /** Does this expression carry its own type evidence, needing no annotation? */
  isKnownEvidenceExpression(expression: TSESTree.Expression): boolean {
    const current = dictionaryTypes.unwrapAssertions(expression, true);
    return (
      current.type === AST_NODE_TYPES.ObjectExpression ||
      current.type === AST_NODE_TYPES.ArrayExpression ||
      current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      current.type === AST_NODE_TYPES.ClassExpression ||
      current.type === AST_NODE_TYPES.FunctionExpression ||
      current.type === AST_NODE_TYPES.NewExpression ||
      current.type === AST_NODE_TYPES.Literal ||
      current.type === AST_NODE_TYPES.TemplateLiteral ||
      current.type === AST_NODE_TYPES.UnaryExpression
    );
  },
} as const;
