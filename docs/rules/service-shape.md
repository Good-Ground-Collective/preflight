# service-shape

Enforce the interface → class → optional singleton shape for service-shaped concepts (charter M-3).

**Presets:** `recommended` only (`error`). This rule is heuristic and false-positive-prone, so it is never part of the blocking `go-no-go` gate.

## What it flags

The charter (M-3) requires service-shaped concepts to follow `interface → class → optional singleton`. Two common deviations slip through review, and this rule flags both:

1. **Interface + object-literal default.** A binding named `default<Something>` whose written type (annotation, `as`, or `satisfies`) references an interface declared in the same module, initialized with an object literal:

   ```ts
   interface Foo { run(): void; }
   const defaultFoo: Foo = { run() {} }; // flagged
   ```

2. **Factory returning a closure or object literal.** A function named `create<Something>` (declaration, function expression, or arrow) that returns an `ObjectExpression` or a function expression instead of a class instance. Indirect returns (`const svc = { … }; return svc;`) are traced within the factory's own scope.

   ```ts
   function createFoo() {
     return { do() {} }; // flagged
   }
   const createBar = () => () => {}; // flagged
   ```

The analysis is purely syntactic — it inspects written annotations and expression shapes only and never consults the type checker (`parserServices` is not used), so the rule works without typed linting.

## Examples

### Incorrect

```ts
interface Foo {
  run(): void;
}
const defaultFoo: Foo = { run() {} };
```

```ts
interface Foo {}
const defaultFoo = {} satisfies Foo;
```

```ts
function createFoo() {
  return { do() {} };
}
```

```ts
const createBar = () => () => {};
```

### Correct

```ts
interface Foo {
  run(): void;
}
class MemoryFoo implements Foo {
  run(): void {}
}
export const foo: Foo = new MemoryFoo();
```

```ts
class Foo {}
function createFoo() {
  return new Foo();
}
```

## Options

None.

## Known false-positive risks

Because this rule matches on naming and expression shape alone, expect (and suppress with an inline disable, with a comment saying why) hits like:

- **Generic `create*` utilities** that legitimately build plain values — `createElement`, `createTestFixture`, `createContext`-style helpers.
- **`default<Foo>` as a legitimate default-value seed**, e.g. an options object fed to a Zod `.default()` or spread as fallback config, where a class would be ceremony.
- **Multi-branch factories** where some branches return `new Impl()` and others return a literal — every literal-returning branch is flagged even if the class path dominates.

Re-export aliases (`export const createFoo = createFooImpl;`) are deliberately **not** flagged — the rule only inspects factory bodies it can see.
