# no-chained-type-assertions

Disallow chained `as` and angle-bracket type assertions, including
parenthesized chains.

## Rule details

`value as unknown as Target` is the standard way to tell TypeScript to stop
objecting. The first assertion widens to a type that is compatible with
everything; the second narrows to whatever was wanted. Neither step checks
anything, and the chain exists precisely because the direct assertion was
rejected — the compiler had a reason, and the chain discards it.

The rule flags a chain of two or more assertions. Only the outermost assertion
reports, so one chain produces one error. A chain built entirely from `as const`
is exempt: const assertions narrow rather than launder.

Parentheses do not matter — `(value as unknown) as Target` and
`value as unknown as Target` are the same tree.

### Incorrect

```ts
const id = value as unknown as UserId;
const id = (value as unknown) as UserId;
const id = <UserId><unknown>value;
const id = value as const as UserId; // one const link does not excuse the other
```

### Correct

```ts
// Keep the precise type the value already had.
const id = makeUserId(value);

// Or parse the untrusted input once, at its boundary.
const id = parseUserId(value); // throws or returns UserId

// A single assertion, justified, is a different matter.
// SAFETY: validated by parseUserId above.
const id = value as UserId;
```

## Known trade-offs

A double assertion is occasionally the only way to express a cast the compiler
cannot follow — between two structurally unrelated branded types, or across a
declaration-merged interface. In those cases the chain is the answer, and the
rule has to be disabled at the line.

## Options

None.

## When not to use it

If you are writing type-level utility code or interop shims where laundering
types is the explicit purpose, disable this rule for those files.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
