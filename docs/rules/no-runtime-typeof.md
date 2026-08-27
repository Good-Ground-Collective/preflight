# no-runtime-typeof

Disallow runtime `typeof` checks; external values must be decoded into
meaningful types at their I/O boundary.

## Rule details

`typeof value === 'string'` narrows a value's *representation* without
establishing what the value *means*. Knowing a field is a string says nothing
about whether it is a user ID, a URL, or an unvalidated blob — so the check
tends to sit wherever the value happens to be used, rather than at the boundary
that received it.

The rule flags every `typeof` operator. The intended shape is to parse external
input once, where it enters the program, and branch on the resulting domain
type everywhere after.

### Incorrect

```ts
function render(input: unknown) {
  if (typeof input === 'string') {
    return renderText(input);
  }
  return renderEmpty();
}
```

### Correct

```ts
// Decode at the boundary, then branch on what the value means.
const content = parseContent(payload); // Content = Text | Empty

function render(content: Content) {
  return content.kind === 'text' ? renderText(content) : renderEmpty();
}
```

## Options

### `allowInTypeGuards`

`boolean`, default `false`.

When `true`, `typeof` is permitted inside a function whose return type is a
type predicate (`value is T`) or an assertion predicate (`asserts value is T`).
This is the escape hatch for hand-written guards, which have to inspect
representation somewhere.

```json
{ "preflight/no-runtime-typeof": ["error", { "allowInTypeGuards": true }] }
```

The exemption applies to the *nearest enclosing function*. A `typeof` inside a
callback declared within a guard is still reported, because that callback
declares no predicate of its own:

```ts
// Still reported even with allowInTypeGuards: the arrow declares no predicate.
function isString(value: unknown): value is string {
  const check = () => typeof value === 'string';
  return check();
}
```

## Known trade-offs

This is the broadest rule in the set. `typeof` has legitimate uses the rule does
not distinguish — feature detection (`typeof window === 'undefined'`),
`typeof x === 'function'` before invoking an optional callback, and narrowing
inside a union whose members are primitives. Enabling it without
`allowInTypeGuards` will report existing guard functions.

## When not to use it

If your codebase does not parse at its boundaries — or is a library that must
accept and inspect caller-supplied values of genuinely unknown shape — this
rule will be noise rather than signal.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
