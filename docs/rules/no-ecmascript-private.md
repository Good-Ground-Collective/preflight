# no-ecmascript-private

Disallow ECMAScript `#private` class members; use TypeScript `private`.

## Rule details

ECMAScript `#private` members and TypeScript `private` both hide state. A
codebase that mixes them asks readers to learn two visibility models, and
`#private` members cannot be reached by test doubles or declaration merging.
This rule settles on TypeScript `private`.

The rule reports `#name` fields, methods, accessors and `accessor` fields,
static or not, once at the declaration. Uses such as `this.#name` and
`#name in obj` are not reported separately.

### Incorrect

```ts
class Counter {
  #count = 0;
  #bump(): void {}
}
```

### Correct

```ts
class Counter {
  private count = 0;
  private bump(): void {}
}
```

## Options

None.

## When not to use it

When you need hard runtime privacy, for example a library guarding state from
untrusted callers.
