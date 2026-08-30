import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

type VisitorKeys = Readonly<Record<string, readonly string[] | undefined>>;

/**
 * Type-level binder queries. A rule that resolves a type reference against
 * module-level aliases has to know which names are shadowed at the reference by
 * a type parameter, an `infer` binder, or a mapped type's key — otherwise it
 * resolves `Value` in `function f<Value>(v: Value)` to an unrelated module alias
 * of the same name. Grouped into a namespace object so this module obeys the
 * `no-loose-functions` rule the plugin enforces on consumers.
 */
export const typeScope = {
  /** Does `value` look like an AST node? */
  isNode(value: unknown): value is TSESTree.Node {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      typeof (value as { type: unknown }).type === 'string'
    );
  },

  /**
   * Collects every `infer X` binder introduced anywhere within `node`. The walk
   * is driven by `visitorKeys` because `infer` can appear at any depth of a
   * conditional type's `extends` clause.
   */
  collectInferNames(
    node: TSESTree.Node,
    visitorKeys: VisitorKeys,
    names: Set<string>,
  ): void {
    if (node.type === AST_NODE_TYPES.TSInferType) {
      names.add(node.typeParameter.name.name);
    }
    const record = node as unknown as Readonly<Record<string, unknown>>;
    for (const key of visitorKeys[node.type] ?? []) {
      const value = record[key];
      if (typeScope.isNode(value)) {
        typeScope.collectInferNames(value, visitorKeys, names);
        continue;
      }
      if (!Array.isArray(value)) continue;
      for (const child of value as unknown[]) {
        if (typeScope.isNode(child)) {
          typeScope.collectInferNames(child, visitorKeys, names);
        }
      }
    }
  },

  /** Type binders in scope at `node` that can shadow a module-level alias. */
  lexicalTypeParameterNames(
    node: TSESTree.Node,
    visitorKeys: VisitorKeys,
  ): ReadonlySet<string> {
    const names = new Set<string>();
    let descendant: TSESTree.Node = node;
    let current: TSESTree.Node | undefined = node;

    while (current != null && current.type !== AST_NODE_TYPES.Program) {
      if ('typeParameters' in current) {
        const declaration = current.typeParameters as
          | TSESTree.TSTypeParameterDeclaration
          | undefined;
        for (const parameter of declaration?.params ?? []) {
          names.add(parameter.name.name);
        }
      }
      // A mapped type's key binds only within its name type and its value type.
      if (
        current.type === AST_NODE_TYPES.TSMappedType &&
        (descendant === current.nameType ||
          descendant === current.typeAnnotation)
      ) {
        names.add(current.key.name);
      }
      // `infer` binders from the `extends` clause are visible in the true branch.
      if (
        current.type === AST_NODE_TYPES.TSConditionalType &&
        descendant === current.trueType
      ) {
        typeScope.collectInferNames(current.extendsType, visitorKeys, names);
      }
      descendant = current;
      current = current.parent;
    }
    return names;
  },
} as const;
