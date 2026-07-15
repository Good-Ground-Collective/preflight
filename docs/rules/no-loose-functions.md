# no-loose-functions

Disallow module-level (loose) functions; behavior belongs in service/class structures, with an allowlist escape hatch by name suffix.

## Rule details

Module-level functions scatter behavior outside the service/class structures the coding charter favors. This rule flags:

- module-level `function` declarations (including `export`-wrapped and `export default` forms), and
- top-level `const`/`let`/`var` bindings whose initializer is an arrow function or function expression.

A binding is exempt when its name ends with an allowlisted suffix. The suffixes `Schema` and `Validator` are always active, so Zod-style validators (`const userSchema = ...`) pass without configuration. Anonymous `export default function () {}` / `export default () => {}` are always flagged — an anonymous function cannot carry an allowlisted suffix.

Functions nested in any non-module scope (inside other functions, blocks, class fields, object literals) and IIFEs are never flagged. Destructured bindings are skipped, since there is no single binding name to check. The rule is pure AST — no type information is required.

### Incorrect

```ts
function helper() {}

const doThing = () => {};

let format = function () {};

export function buildReport() {}

export default () => {};
```

### Correct

```ts
// Allowlisted suffixes (defaults: Schema, Validator).
const userSchema = z.object({});
const parseValidator = (input: unknown) => userSchema.parse(input);

// Behavior lives on a class/service.
class ReportService {
  buildReport() {}
  format = () => {};
}

// Nested functions are fine.
function outerSchema() {
  function helper() {}
}

// IIFEs are call expressions, not loose bindings.
(() => {
  bootstrap();
})();
```

## Options

```jsonc
{
  "preflight/no-loose-functions": [
    "error",
    {
      // Extends (never replaces) the built-in ["Schema", "Validator"].
      "allowedSuffixes": ["Guard"]
    }
  ]
}
```

### `allowedSuffixes`

`string[]`, default `[]`. Additional name suffixes that exempt a binding. User suffixes extend the built-in defaults — `Schema` and `Validator` remain active regardless of configuration.

With `{ "allowedSuffixes": ["Guard"] }`:

```ts
const routeGuard = () => {}; // correct — custom suffix
const userSchema = () => z.object({}); // correct — built-in default still active
const fooHelper = () => {}; // incorrect
```

## When not to use it

If your codebase deliberately embraces free-standing module functions (e.g. a functional-programming style), this rule will fight you — leave it off.
