# require-safety-comment-for-type-assertion

Require a nearby `SAFETY:` comment for every type assertion except const
assertions.

## Rule details

A type assertion claims an invariant the compiler cannot verify. That claim is
either true for a reason, or it is a guess — and the difference is invisible in
the code unless someone writes it down. This rule requires the reason.

The rule flags any `as` or angle-bracket assertion with no `SAFETY:` comment
attached. The comment may sit immediately before the assertion, or before the
statement containing it; the search climbs from the assertion to its enclosing
expression statement, variable declaration, return, throw, or property
definition, and stops there. A comment *after* the assertion does not count.

`as const` is exempt — it asserts nothing about external evidence.

The marker is matched as `SAFETY:` with optional surrounding whitespace, in
either a line or a block comment.

### Incorrect

```ts
const id = value as UserId;
const id = <UserId>value;

// This cast seems fine.
const id = value as UserId; // a comment that is not a SAFETY note

const id = value as UserId; // SAFETY: too late — the comment trails the assertion
```

### Correct

```ts
// SAFETY: parseUserId above rejected every non-conforming value.
const id = value as UserId;

const id = /* SAFETY: the branch guarantees the invariant. */ value as UserId;

function parse(): UserId {
  // SAFETY: validation above established the UserId invariant.
  return value as UserId;
}

const values = [1, 2] as const; // const assertions are exempt
```

## Known trade-offs

The rule checks that a justification exists, not that it is true. A `SAFETY:`
comment that is wrong, or that has gone stale as the code around it changed,
satisfies the rule. Its value is in forcing the author to state a reason at the
moment they write the assertion, and in giving reviewers something to disagree
with.

Adopting this rule on an existing codebase reports every current assertion.

## Options

None.

## When not to use it

If your codebase has few assertions and reviews each one, the comment
requirement may be ceremony. If it has thousands, adopt it per-directory.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
