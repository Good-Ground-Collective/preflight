# no-switch-with-nested-if

Disallow `if` statements nested directly inside `switch` cases.

## Rule details

The charter (M-10) calls a `switch` containing nested `if` statements a smell
to be flattened: once a case needs its own conditional, the branching has
outgrown the `switch` and should be split into more cases, extracted into a
function, or replaced with a lookup.

This rule flags an `IfStatement` that is either:

- a **direct child** of a `SwitchCase`'s consequent, or
- **one block-statement deep** inside the case (i.e. inside a `{ ... }` block
  that is itself directly under the case).

It fires for `default:` cases too, and regardless of where the `if` sits among
the case's statements. It is a pure AST rule with no options and no autofix —
flattening is a design decision, not a mechanical rewrite.

An `if` nested inside a *deeper* structure within the case — a `for`/`while`
loop body, a `try` block, or a callback defined in the case — is **not**
flagged; that conditional belongs to the inner construct, not to the `switch`.

### Incorrect

```ts
switch (x) {
  case 1:
    if (y) doA();
    break;
  case 2: {
    if (y) {
      doB();
    }
    break;
  }
  default:
    if (z) doC();
}
```

### Correct

```ts
switch (x) {
  case 1:
    doA();
    break;
  case 2:
    doB();
    break;
}

// An `if` inside a deeper structure within a case is fine:
switch (x) {
  case 1:
    for (const item of items) {
      if (item.ok) doA(item);
    }
    break;
}
```

## Known trade-offs

An early guard placed directly in a case is flagged by definition, even though
it can read cleanly:

```ts
switch (x) {
  case 1:
    if (!valid) return; // flagged
    doA();
    break;
}
```

This is an accepted trade-off: hoist the guard above the `switch`, or extract
the case body into a function that guards internally.

## Options

None.

## When not to use it

If your codebase deliberately embraces conditional logic inside `switch` cases
(for example, generated code or dense parser tables), disable this rule for
those files.
