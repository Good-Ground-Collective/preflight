# error-class-sets-name

Require `Error` subclasses to set `name` so runtime errors identify as themselves, not the base class.

## What it flags

A `class` (declaration or expression) whose superclass is the identifier `Error` — or any identifier ending in `Error`, e.g. `AppError` — that never sets `name`:

- no non-static, non-computed `name` property definition in the class body, and
- no top-level `this.name = …` assignment in the constructor.

## Why

An error subclass that never sets `name` inherits the base class's. At runtime, `err.name`, `err.toString()`, and stack traces all report the base class (`Error`, `AppError`, …), defeating log filtering and instanceof-by-name checks across serialization boundaries. The charter's error-class convention requires setting `name`; this rule enforces it.

## Examples

Incorrect:

```ts
class TimeoutError extends Error {}

class ParseError extends AppError {
  constructor(message: string) {
    super(message);
  }
}
```

Correct:

```ts
class TimeoutError extends Error {
  override name = 'TimeoutError';
}

class ParseError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}
```

## Autofix

The rule is autofixable (`meta.fixable: 'code'`): it inserts `override name = '<ClassName>';` immediately after the class body's opening `{`, which works for empty and non-empty bodies alike. The class name is taken from the class's own identifier, or — for an anonymous class expression — from the variable it is assigned to:

```ts
// Before
class TimeoutError extends Error {}

// After
class TimeoutError extends Error {
  override name = 'TimeoutError';}
```

Notes:

- A truly anonymous class (e.g. `export default class extends Error {}` or `new (class extends Error {})()`) is still reported, but **no fix is offered** — there is no name to write.
- The inserted line's indentation is a best-effort column guess (spaces only); a formatter or ESLint's subsequent fix passes normalize it. In particular, tab-indented files get a space-indented insertion.

## Limitations (accepted)

- **Imported or renamed base classes:** detection is purely by identifier name. A base class that is imported under a name not ending in `Error` (or aliased, or reached via a member expression like `bases.Error`) is not detected — this is a pure-AST rule with no type information. If this gap ever matters, `@typescript-eslint/type-utils`'s `isErrorLike` is the escape hatch, at the cost of requiring typed linting.
- **Shallow constructor heuristic:** only top-level `this.name = …` statements in the constructor count. An assignment nested inside an `if`/`try`, or done via a helper, is not recognized and the class is flagged.
- Conversely, any identifier ending in `Error` is treated as error-like even if it does not actually extend `Error`.
