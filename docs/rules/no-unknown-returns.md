# no-unknown-returns

Disallow functions whose explicit return contract is `unknown` or
`Promise<unknown>`.

## Rule details

Returning `unknown` hands the caller a value it must re-derive meaning from.
The function had the evidence — it did the fetch, ran the query, read the file
— and then discarded it at the boundary where it would have been most useful.
Every caller now repeats the same parsing, or asserts and hopes.

The rule flags an explicit return annotation that resolves to `unknown`, across
functions, arrow functions, methods, constructors, call and construct
signatures, standalone function types, and ambient declarations. Resolution
looks through:

- module-level type aliases, including chains
- unions — `string | unknown` is as broad as `unknown`
- one level of `Promise` / `PromiseLike`

A type parameter shadowing an alias name is respected, so
`function f<Value>(): Value` is not resolved against a module-level
`type Value = unknown`. Generic aliases resolve per call site and are left
alone.

An *inferred* return type is not an explicit contract and is not reported.

### Incorrect

```ts
function load(): unknown {}
const load = (): unknown => input;
type Loader = () => unknown;
interface Loader {
  load(): unknown;
}
declare function load(): unknown;

function load(): string | unknown {}
function load(): Promise<unknown> {}

type UnknownValue = unknown;
function load(): UnknownValue {}
```

### Correct

```ts
// Return the parsed domain type.
function load(): User {
  return parseUser(row);
}
function load(): Promise<User> {}

// `unknown` nested on a property is not the return contract itself.
function fail(): { readonly cause: unknown } {}

// An inferred return type carries no explicit `unknown`.
function load() {
  return input;
}
```

## Known trade-offs

A function that genuinely returns an undecoded value — the outermost layer of a
deserializer, a generic cache `get` — has `unknown` as its honest return type.
Those signatures are reported and need an exception.

## Options

None.

## When not to use it

If your codebase's parsing boundary sits above the functions this rule
inspects, adopt it per-directory rather than repository-wide.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
