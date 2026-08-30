# no-conditional-empty-object-spread

Disallow object spreads that conditionally spread an empty object to omit
fields.

## Rule details

`{ ...(condition ? { value } : {}) }` expresses "include this key only
sometimes" by spreading nothing in the other branch. The omission is real but
invisible: nothing at the property's position says it may be absent, and the
resulting type is a union that readers have to reconstruct from the spread.

The rule flags a `SpreadElement` inside an object literal whose argument is a
conditional expression with an empty object literal in either branch. A
conditional with properties on both sides is not omitting anything and is left
alone, as is a conditional that is not spread at all.

### Incorrect

```ts
const request = {
  id,
  ...(value !== undefined ? { value } : {}),
  ...(condition ? {} : { fallback }),
};
```

### Correct

```ts
// Build the object in statements, adding the property only when present.
const request: Request = { id };
if (value !== undefined) {
  request.value = value;
}

// Or make the optionality explicit in the type.
const request = { id, value: value ?? undefined };
```

## Known trade-offs

The conditional-spread idiom is common and compact, and this rule has no
autofix, because the replacement changes the resulting type: `{ value?: T }`
and `{ value: T | undefined }` are not the same contract, and picking between
them is a design decision.

## Options

None.

## When not to use it

If your codebase builds request payloads where an absent key and a key set to
`undefined` differ to the receiver, and the conditional spread is the
established way to express that, disable this rule.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
