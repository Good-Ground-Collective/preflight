# no-widen-then-assert

Disallow local `const` flows that explicitly widen a known value before
asserting the widened binding to a narrower type.

## Rule details

This is the round trip:

```ts
const source = { id: 'first' };
const widened: unknown = source; // evidence discarded
const parsed = widened as { readonly id: string }; // evidence recreated
```

The first line knew the type. The second threw it away. The third asserted it
back — without checking anything, because there was nothing left to check
against. The net effect is an unchecked cast written across three lines, where
the value never left the function and was never in doubt.

The rule reports the assertion when all of the following hold:

- the asserted expression is a plain identifier bound by a `const` declaration
- that binding is never written after initialisation
- the binding widened a value whose type was **syntactically known** — a literal,
  an object or array literal, `new`, a function or class expression, or another
  such binding traced through `const`s
- the widening and the assertion sit in the **same function**
- the assertion appears **after** the widening declaration
- the asserted type is genuinely **narrower** than the widened one

Widening is recognised both as an annotation (`const widened: unknown = source`)
and as an assertion on the initialiser (`const widened = source as unknown`).
The broad types are `unknown`, `any`, `object`, and a broad record —
`Record<K, unknown>` or its index-signature spelling `{ [key: string]: unknown }`,
optionally wrapped in `Readonly`.

Narrowness is judged against the widening kind: from `unknown`/`any`, any
non-broad type is narrower; from `object`, a type that is definitely an object
(array, tuple, function, mapped type, non-empty literal); from a broad record, a
record with a concrete value type or a literal with a non-index member. An
assertion whose type is *also* broad recovers nothing and is not reported.

### Incorrect

```ts
const source = { id: 'second' };
const widened: unknown = source;
const parsed = widened as { readonly id: string };

// Widened by an assertion on the initialiser instead.
const widened = source as unknown;
const parsed = widened as { readonly id: string };

// Broad record narrowed back to a concrete value type.
const widened: Record<string, unknown> = source;
const parsed = widened as Record<string, Command>;

// Evidence traced through an intermediate `const`.
const alias = source;
const widened: unknown = alias;
const parsed = widened as { readonly id: string };
```

### Correct

```ts
// Keep the precise type from initialisation through use.
const source = { id: 'first' };
const parsed = source;

// The value genuinely arrives as `unknown`, so the assertion is the first claim.
declare const input: unknown;
const parsed = input as { readonly id: string };

// Asserting back to another broad type recovers nothing, so there is no round trip.
const widened: unknown = source;
const parsed = widened as object;

// The initialiser is a call: nothing syntactically known about it.
const widened: unknown = load();
const parsed = widened as { readonly id: string };

// A `let` binding can be rewritten, so its value is not known at the assertion.
let widened: unknown = source;
const parsed = widened as { readonly id: string };
```

## Known trade-offs

The same-function requirement means the rule misses the equivalent round trip
across a function boundary, where a value is widened in one function and
asserted in another. That is deliberate: once the value crosses a boundary, the
widening may be load-bearing for the signature, and the rule cannot tell.

Evidence tracing is syntactic and stops at the first thing it cannot see
through, so a value that passes through a call is not tracked.

## Options

None.

## When not to use it

If your codebase deliberately widens values to satisfy an external API's
signature and narrows them again on the way back, disable this rule at those
sites.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
