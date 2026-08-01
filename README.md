# @good-ground-collective/preflight

ESLint plugin enforcing the coding charter — nit-level review feedback, caught before the PR.

Flat-config only (ESLint 9+). Every rule is a pure AST check, so no type-aware setup (`parserOptions.project`) is required.

## Install

The package is published to **GitHub Packages**, which requires auth to install even though it's public. See [Registry auth](#registry-auth) below to set that up first, then:

```sh
npm i -D @good-ground-collective/preflight \
  eslint \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  eslint-plugin-unicorn eslint-plugin-import-x \
  typescript
```

The extra packages are peer dependencies the shared configs wire in. (`eslint-plugin-import-x` is only used by the `recommended` config — skip it if you only use `go-no-go`.)

## Quickstart

The plugin ships two ready-made flat configs, both arrays you spread into your config:

| Config | What it is |
| --- | --- |
| `go-no-go` | The blocking gate. Every rule is an `error` and the set is kept free of false-positive-prone rules — safe to fail a build on. |
| `recommended` | A superset of `go-no-go` plus the fuzzier, nice-to-have rules. |

### New config (only these rules)

Create `eslint.config.js` (or `.ts`) with nothing but the shared config:

```js
import preflight from '@good-ground-collective/preflight';

export default [
  ...preflight.configs.recommended, // or: preflight.configs['go-no-go']
];
```

That's it — the config already scopes itself to `**/*.ts` / `**/*.tsx`, registers the plugin, and sets the TypeScript parser.

### Existing config

Spread a shared config into your array. Put it after your own blocks so its rules win where they overlap:

```js
import preflight from '@good-ground-collective/preflight';

export default [
  // ...your existing config...
  ...preflight.configs.recommended,
];
```

Prefer to cherry-pick? Register the plugin and enable only the rules you want:

```js
import preflight from '@good-ground-collective/preflight';

export default [
  // ...your existing config...
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { preflight },
    rules: {
      'preflight/no-throw-helpers': 'error',
      'preflight/no-planning-identifiers': 'error',
    },
  },
];
```

## Rules

Every rule is prefixed `preflight/` and is a pure AST check (no type information required). The **Set** column tells you where each rule lives:

- **go-no-go** — in the blocking `go-no-go` gate, and therefore also in `recommended`.
- **recommended** — added by `recommended` only; heuristic or fuzzier, so it's kept out of the blocking gate.

| Rule | Set | What it does |
| --- | --- | --- |
| [`error-class-sets-name`](#error-class-sets-name) | go-no-go | `Error` subclasses must set `name`. |
| [`no-loose-functions`](#no-loose-functions) | go-no-go | No module-level functions. |
| [`no-paragraph-comments`](#no-paragraph-comments) | go-no-go | No narrative comment blocks. |
| [`no-planning-identifiers`](#no-planning-identifiers) | go-no-go | No planning-system IDs in comments/strings. |
| [`no-switch-with-nested-if`](#no-switch-with-nested-if) | go-no-go | No `if` nested directly inside a `switch` case. |
| [`no-throw-helpers`](#no-throw-helpers) | go-no-go | No functions whose whole body is a `throw`. |
| [`constructor-single-props`](#constructor-single-props) | recommended | Constructors take a single props object. |
| [`service-shape`](#service-shape) | recommended | Services follow interface → class → singleton. |

### go-no-go rules

The blocking gate — all `error`, chosen to be false-positive-safe. Also included in `recommended`.

#### error-class-sets-name

**Set: go-no-go · autofixable.** Requires `Error` subclasses (any superclass identifier ending in `Error`, e.g. `AppError`) to set `name` — via a `name` property or `this.name = …` in the constructor. Otherwise `err.name`, `toString()`, and stack traces all report the base class, defeating log filtering and name-based checks across serialization boundaries.

```ts
class TimeoutError extends Error {} // ✗ — errors identify as "Error"

class TimeoutError extends Error {
  override name = 'TimeoutError'; // ✓
}
```

[Full docs →](./docs/rules/error-class-sets-name.md)

#### no-loose-functions

**Set: go-no-go · has options.** Flags module-level `function` declarations (including `export` and `export default` forms) and top-level `const`/`let`/`var` bindings initialized with an arrow or function expression — behavior belongs on a service or class. Bindings whose name ends with an allowlisted suffix are exempt: `Schema` and `Validator` always, plus any you add via the `allowedSuffixes` option. Nested functions and IIFEs are never flagged.

```ts
const doThing = () => {}; // ✗
const userSchema = z.object({}); // ✓ — allowlisted suffix
```

[Full docs →](./docs/rules/no-loose-functions.md)

#### no-paragraph-comments

**Set: go-no-go.** Flags narrative comment blocks: two or more consecutive `//` lines at the top of a file, and paragraph comments (a block comment, or a 2+ line run) floating above non-declaration code. Concepts belong in JSDoc on the declaration they describe. Single why-comments, JSDoc attached to a declaration — including class and interface members — license headers, shebangs, and `eslint-*` directives are left alone.

[Full docs →](./docs/rules/no-paragraph-comments.md)

#### no-planning-identifiers

**Set: go-no-go · has options.** Catches planning-system identifiers — `Phase 2`, ticket IDs like `KAN-20`, `PLAN.md`, "from a previous phase" — in comments and strings, where they outlive the systems that gave them meaning. Comment hits get a remove *suggestion* (never auto-applied); string hits are report-only. Suppress an intentional hit with an `eslint-disable` directive.

```ts
// resolves D-09 open redirect  ✗
/* Phase 2: wire the adapters */  // ✗
```

Two additive options teach it your team's vocabulary — the built-in patterns always stay active:

```js
'preflight/no-planning-identifiers': ['error', {
  prefixes: ['ACME', 'GH'],   // sugar → catches ACME-42, GH-7
  patterns: ['sprint \\d+'],  // full regex escape hatch
}],
```

`prefixes` compiles each entry to `\b<prefix>-\d+\b` with the prefix matched literally. The default `[A-Z]{3,}-\d\d` already catches most uppercase ticket IDs, so `prefixes` is for the shapes it misses — short (`GH-7`, `T-3`) and non-uppercase (`gh-7`) ones.

[Full docs →](./docs/rules/no-planning-identifiers.md)

#### no-switch-with-nested-if

**Set: go-no-go.** Flags an `if` statement that is a direct child of a `switch` case (or one block-statement deep inside it). Once a case needs its own conditional, the branching has outgrown the `switch` — split it into more cases, extract a function, or use a lookup. An `if` inside a deeper structure (loop body, `try`, callback) is left alone.

```ts
switch (x) {
  case 1:
    if (y) doA(); // ✗
    break;
}
```

[Full docs →](./docs/rules/no-switch-with-nested-if.md)

#### no-throw-helpers

**Set: go-no-go.** Bans functions whose entire body is a single `throw` statement — they hide the error type behind an extra call frame and defeat TypeScript's control-flow narrowing at the call site. Throw a named error class inline instead. (Class and object methods count too.)

```ts
function fail() { throw new AppError(); } // ✗
if (!user) throw new UserNotFoundError(id); // ✓ — inline at the call site
```

[Full docs →](./docs/rules/no-throw-helpers.md)

### recommended-only rules

Added by `recommended` on top of the go-no-go set. More heuristic, so they're kept out of the blocking gate.

#### constructor-single-props

**Set: recommended.** Requires constructors to take a single props object, banning the `constructor(config, deps)` split. TypeScript parameter properties each count as one parameter, so the shorthand split is flagged too. Multiple parameters make call sites order-dependent and resist the schema-validation pattern the charter prescribes.

```ts
class Service {
  constructor(config: Config, deps: Deps) {} // ✗
}
```

[Full docs →](./docs/rules/constructor-single-props.md)

#### service-shape

**Set: recommended.** Enforces the `interface → class → optional singleton` shape for service-shaped concepts. Flags a `default<Name>` binding typed as a same-module interface but initialized with an object literal, and a `create<Name>` factory that returns an object literal or closure instead of a class instance (indirect returns are traced within the factory's own scope).

```ts
interface Foo { run(): void; }
const defaultFoo: Foo = { run() {} }; // ✗
function createFoo() { return { do() {} }; } // ✗
```

[Full docs →](./docs/rules/service-shape.md)

### Also enforced by the presets

Beyond the `preflight/` rules, both shared configs turn on a few third-party rules: `@typescript-eslint/member-ordering`, `@typescript-eslint/naming-convention`, and `unicorn/filename-case` in `go-no-go`, plus `@typescript-eslint/consistent-type-imports`, `@typescript-eslint/no-explicit-any`, and `import-x/no-default-export` in `recommended`. See the config source for the exact settings.

#### Member order

`@typescript-eslint/member-ordering` fixes one order for class members, visibility descending within each tier:

| # | Tier |
| --- | --- |
| 1 | Index signatures (`readonly` and mutable share a rank) |
| 2 | Instance fields — `public`, `protected`, `private`, `#private`, then `abstract` |
| 3 | The constructor |
| 4 | Accessors — `get` before its `set`, instance then `abstract` |
| 5 | Instance methods — `public`, `protected`, `private`, `#private`, then `abstract` |
| 6 | Static fields, then `static {}` initialization blocks |
| 7 | Static accessors, then static methods |

Two choices in there are worth naming, because either direction is defensible:

- **Accessors sit above the methods**, on the reasoning that a getter is a field-like read and belongs nearer the state it exposes.
- **Abstract members sort last within their own tier** rather than forming one block after the constructor, so a base class reads as fields-then-methods like any other.

The list names every category explicitly, including `#private` members and static accessors. That is deliberate rather than verbose: `memberTypes` is **exhaustive, not a prefix** — a category absent from the array is unranked and may appear anywhere without violating the rule. A partial list silently has no opinion about whatever it omits.

Members whose category the list ranks by a *more specific* name win over a broader one, so `readonly` and decorated members follow their visibility tier rather than needing entries of their own.

One limit: this orders **classes only**. Interface and type-literal members match only the unqualified `field`/`method` names — they have no visibility or scope to rank — so the preset deliberately says nothing about the order of members inside an `interface` or `type`.

#### File naming

`unicorn/filename-case` is scoped by extension, because the correct case is a property of the framework rather than of the language:

| Files | Allowed |
| --- | --- |
| `**/*.ts` | `kebab-case` |
| `**/*.tsx`, `**/*.jsx` | `kebab-case` **or** `PascalCase` |

JSX files accept both rather than mandating `PascalCase`, because hooks, context modules and tests (`user-card.test.tsx`) share those extensions with components. `UserCard.tsx` and `use-auth.tsx` both pass; `user_card.tsx` does not.

Directory names owned by the tooling ecosystem are exempt, since renaming them breaks test discovery and module mocking:

```js
ignore: [/^__(tests|mocks|snapshots|fixtures)__$/]
```

Note that `ignore` short-circuits the whole rule for a path, so this exempts everything *inside* `__tests__` — file names included — not just the directory name itself. `unicorn/filename-case` offers no narrower option.

Listing `**/*.jsx` means the preset lints `.jsx` files, which the `**/*.ts`/`**/*.tsx` rule blocks do not otherwise match. Those files are parsed with JSX enabled, but only `filename-case` applies to them.

#### Naming

`@typescript-eslint/naming-convention` draws one line: **names you choose** are enforced, **names a third party chose** are not.

| What | Required |
| --- | --- |
| Static class properties | `UPPER_CASE` |
| Instance class properties, parameter properties | `camelCase` (leading `_` allowed) |
| Variables, parameters, functions | `camelCase` |
| `NULL_`/`UNKNOWN_` null-object constants | `UPPER_CASE` |
| `const` bindings ending `Schema` or `Validator` | `camelCase` **or** `PascalCase` |
| Types, interfaces, enums | `PascalCase` (no `I` prefix) |
| Object-literal keys | any deliberate case |

The `Schema`/`Validator` allowance uses the same suffix list that exempts a binding from [`no-loose-functions`](#no-loose-functions), so `export const UserSchema = z.object({})` satisfies both rules. The two are built from one constant, not kept in step by hand.

**Object-literal keys** accept `camelCase`, `PascalCase`, `snake_case` and `UPPER_CASE`. Keys are overwhelmingly a wire format rather than a name — `issue_number` is Octokit's spelling, `Authorization` is the HTTP header, `JIRA_HOST` is the env var — and the previous `camelCase` mandate enforced casing on exactly the half of a contract that happened to be identifier-safe:

```ts
const HEADING_KEYS: Record<string, SectionKey> = {
  'Problem Statement': 'problemStatement',   // exempt: requires quotes
  Solution: 'solution',                      // was an error
};
```

Only a key in no deliberate case at all (`issue_Number`) still fails. Class properties are unaffected — `class A { issue_number = 1 }` is still an error, because class state is yours to name.

Members of `interface`/`type` declarations are not checked, for the same reason: they routinely mirror an API response shape.

## Registry auth

GitHub Packages requires a token to install. Add these two lines to `.npmrc` — both are safe to commit, since `${GITHUB_TOKEN}` is an env-var reference that npm expands at read time, not your actual token:

```
@good-ground-collective:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then provide the token via your environment:

```sh
export GITHUB_TOKEN=<a classic PAT with the read:packages scope>
```

In GitHub Actions, no PAT is needed — set `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on your install step and give the job `permissions: packages: read`.

## License

[Apache License 2.0](LICENSE)
