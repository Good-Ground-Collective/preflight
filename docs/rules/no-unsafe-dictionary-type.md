# no-unsafe-dictionary-type

Disallow object-dictionary contracts whose direct value type is `unknown`,
`any`, `object`, `{}`, or a union/alias containing one of those escape hatches.

## Rule details

`Record<string, unknown>` promises a lookup and delivers nothing: every read
returns a value the caller must narrow before using. The dictionary shape says
"you may index this by any key", and the value type says "and I will tell you
nothing about what comes back". Together they are a bag.

The rule flags a dictionary whose **direct** value type is an escape hatch. It
recognises dictionaries written as `Record<K, V>`, as an index signature
(`{ [key: string]: V }`), and as a mapped type (`{ [K in string]: V }`), and it
resolves through:

- module-level type aliases and their chains
- generic aliases, substituting the type arguments at the use site, including
  parameter defaults
- the transparent built-ins `Readonly`, `Partial`, `Required`, `NonNullable`
- `Pick` and `Omit`, which preserve the source's value type

A built-in shadowed in the file — a local `Record`, or one imported from
elsewhere — is not the built-in, and the rule stops treating it as one.

Escape hatches are `unknown`, `any`, `object`, `{}`, an interface or literal
that is empty or has only `?: never` members, and any union containing one of
those. An intersection is unsafe when `any` appears in it, or when every member
is unsafe.

`unknown` *nested inside* the value type is fine — `Record<string, { payload: unknown }>`
gives callers a real contract with one open field.

Reporting is deduplicated two ways: a dictionary enclosed in another unsafe
dictionary does not report separately, and a bare use of an alias reports at the
alias declaration rather than at each use site.

### Incorrect

```ts
type A = Record<string, unknown>;
type B = { [key: string]: any };
type C = { [K in PropertyKey]: object };
type D = Record<string, {}>;
type E = Record<string, string | unknown>;
type F = Readonly<Record<string, unknown>>;
interface G {
  [key: string]: unknown;
}

interface Escape {}
type H = Record<string, Escape>;

type Index<T> = Record<string, T>;
type I = Index<unknown>;
```

### Correct

```ts
type Commands = Record<string, Command>;
type Metadata = Record<PropertyKey, JsonValue>;
type Indexed = { [key: string]: Command };
type Exhaustive = { [K in Permission]: number };

// `unknown` nested in the value type leaves a real contract.
type Allowed = Record<string, { payload: unknown }>;

// An unapplied type parameter is not an escape hatch.
type Index<T> = Record<string, T>;
type EntityIndex<T extends Entity> = Record<string, T>;

// Map types are not object dictionaries.
type Cache = Map<string, unknown>;
```

## Known trade-offs

`Record<string, unknown>` is the idiomatic parameter type for "an arbitrary JSON
object" at a boundary, and this rule reports it there too. The intended answer
is a named `JsonValue` union, which is more work to define.

Resolution is syntactic. A dictionary whose value type comes from an imported
alias is not resolved, so the rule can miss cases across module boundaries.

## Options

None.

## When not to use it

If your codebase passes arbitrary JSON objects through many layers before
parsing them, adopt this rule at the layer where parsing happens rather than
repository-wide.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
