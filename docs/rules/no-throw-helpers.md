# no-throw-helpers

Disallow helper functions whose entire body is a single `throw` statement.

## Rule details

The coding charter (M-11) bans sentinel/throw-helper functions — functions whose
whole job is to throw. They hide the error type behind an extra call frame,
defeat TypeScript's control-flow narrowing at the call site, and add indirection
for no behavioral gain. Throw a named error class inline at the call site
instead.

This rule flags any function declaration, function expression, or arrow function
whose body is a block containing exactly one `ThrowStatement`. It is a pure AST
check — no type information is required. The report is placed on the function
node itself, not the inner `throw`.

### Incorrect

```ts
function fail() {
  throw new AppError();
}

const boom = () => {
  throw new Error('x');
};

const o = {
  m() {
    throw new Error();
  },
};

async function nope() {
  throw new Error();
}
```

### Correct

```ts
// Throw inline at the call site instead of via a helper.
if (!user) {
  throw new UserNotFoundError(id);
}

// A throw among other statements is real logic, not a throw helper.
function f() {
  log();
  throw new Error();
}

// Conditional throws are fine.
function assertPositive(n: number) {
  if (n <= 0) throw new RangeError('expected positive');
}
```

## Limitations and trade-offs

- Class and object methods are `FunctionExpression` values, so abstract-method
  stubs such as `get notImplemented() { throw new NotImplementedError(); }`
  **are** flagged. This is an accepted trade-off — the charter offers no
  exemption for the pattern. An option to exempt class members could be added
  later if it proves too noisy.
- A directive prologue (`'use strict';`) followed by a throw is two statements
  and is therefore not flagged.
- A throw wrapped in a nested block (`function f() { { throw x; } }`) is not
  flagged; the outer body's single statement is a block, not a throw.

## Options

This rule has no options.
