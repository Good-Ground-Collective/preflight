# no-comments

Disallow comments other than doc comments on declarations and tool directives.

## Why

The charter bans explanatory comments (M-2) and commented-out code (M-14).
Intent belongs in names and types, and the few concepts that need prose belong
in a doc comment on the declaration they describe, where editors surface them
and refactors keep them attached. Everything else drifts out of date.

## What it flags

- Every `//` and `/* */` comment that is not a directive, including trailing
  comments and commented-out code.
- A `/** */` doc comment whose next token does not start a declaration, such
  as one in the middle of a function body, above an `if`, inside a call's
  arguments, above a re-export (`export { a }`), or dangling at the end of a
  file. Doc syntax can't be used to slip a comment through.

## What it leaves alone

- A `/** */` doc comment directly before a declaration: a class, interface,
  type alias, function (including `declare function`), enum or enum member,
  variable declaration, class member (method, property, accessor, constructor
  parameter property, and their `abstract` forms), interface or type-literal
  property, method, index, call or construct signature, object-literal
  property, or an `export` / `export default` that wraps one of these.
  Decorators between the comment and the declaration are fine.
- Comments whose text starts with an allowed prefix (see Options). Leading
  whitespace and, in block comments, leading `*` are ignored when matching.
  A prefix ending in `:` also matches with whitespace before the colon, so
  `// SAFETY : …` passes here exactly as it does for
  [`require-safety-comment-for-type-assertion`](./require-safety-comment-for-type-assertion.md).
  That rule accepts a `SAFETY:` note anywhere in the comment; this one needs it
  first, so write the note as `// SAFETY: …` to satisfy both.
- ESLint's own inline config comments, whatever the options say:
  `eslint-disable*`, `eslint-enable`, `eslint-env`, `/* eslint rule: … */`,
  `/* global */`, `/* globals */` and `/* exported */`.
- Triple-slash directives (`/// <reference types="node" />`) and shebangs.

This rule makes [`no-paragraph-comments`](./no-paragraph-comments.md)
redundant inside `recommended`. That rule stays in `go-no-go` for repos that
don't adopt `recommended`.

No autofix: deleting a comment loses information a human should move first.

## Examples

### Incorrect

```ts
// explains the next line
const total = sum(items);
```

```ts
const timeout = 30; // seconds
```

```ts
// const legacy = load();
```

```ts
function run(): void {
  /** slipping a comment through doc syntax */
  flush();
}
```

### Correct

```ts
/** Adds two numbers. */
export function add(a: number, b: number): number {
  return a + b;
}
```

```ts
interface User {
  /** Unique across tenants. */
  id: string;
}
```

```ts
// SAFETY: validated by the schema above.
const id = value as UserId;
```

```ts
// eslint-disable-next-line no-console -- CLI output
console.log(report);
```

## Options

```js
'preflight/no-comments': ['error', {
  allowPrefixes: [
    'eslint-disable', 'eslint-enable',
    '@ts-expect-error', '@ts-ignore',
    'prettier-ignore', 'c8 ignore', 'v8 ignore', 'istanbul ignore',
    'SAFETY:',
  ],
  additionalPrefixes: [],
}]
```

- `allowPrefixes` replaces the default list above.
- `additionalPrefixes` adds to it, for annotations another lint rule requires,
  such as a `// raw-sql: <reason>` escape hatch. A plugin that requires
  annotations can export its prefix list for consumers to spread in.

## Migration

Code that already avoids explanatory comments is nearly clean. A codebase with
heavy narrative commenting needs a bulk cleanup, or a temporary `files`
override that turns the rule off for legacy paths and shrinks over time.
