# no-shape-in-symbol-names

Disallow structural terms such as "shape" in JavaScript, TypeScript, private,
and JSX symbol names.

## Rule details

A symbol named `userShape` describes how a value is laid out rather than what it
is or who owns it. The name survives long after the layout stops being the
interesting thing about it, and it tends to attach to types that exist only to
group fields — the opposite of a domain type.

The rule flags any `Identifier`, `PrivateIdentifier`, or `JSXIdentifier` whose
name contains a banned term, matched case-insensitively as a substring. That
covers variables, parameters, type names, property names, and imported names
alike.

### Incorrect

```ts
const userShape = { id: 1 };
type ShapeOfUser = { readonly id: string };
class Store {
  #shapeCache = new Map();
}
```

### Correct

```ts
const user = { id: 1 };
type User = { readonly id: string };
class Store {
  #usersById = new Map<UserId, User>();
}
```

## Options

### `terms`

`string[]`, default `['shape']`.

The case-insensitive substrings banned from symbol names. Supplying a list
**replaces** the default rather than extending it, so include `"shape"` if you
want to keep it:

```json
{ "preflight/no-shape-in-symbol-names": ["error", { "terms": ["shape", "payload", "data"] }] }
```

An empty list disables the rule.

Upstream hardcodes `shape`; `terms` is preflight's addition, since the term a
team wants to ban is a house-style decision.

## Known trade-offs

Matching is by substring, not by word, so a name that merely contains the term
is reported too — `shaper` matches `shape`. This keeps the rule from needing a
word-splitting heuristic that would have its own failure modes, but it means
some renames are forced for the wrong reason. If a term is causing collisions,
drop it from `terms`.

The rule also fires on identifiers you do not control, such as an imported name
or a property on an external API's response type.

## When not to use it

If your domain genuinely is geometry, rendering, or anything else where "shape"
names a real concept, do not enable this rule with the default term.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
