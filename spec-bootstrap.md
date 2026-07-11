# preflight — rule catalog (bootstrap)

`preflight` is an ESLint plugin for TypeScript projects. It exports a set of
rules plus two rulesets:

- **go-no-go** — the small, deterministic, blocking gate. Every rule is `error`.
  These must never ship violated, so the set stays free of false-positive-prone
  rules; a misfire must never block a merge.
- **recommended** — extends `go-no-go` and adds the higher-value-but-fuzzier
  rules and a few niceties. This is the full opinionated experience.

`recommended ⊇ go-no-go`. Consumers extend `recommended` to get everything, or
`go-no-go` for CI gating only.

Ships flat-config-first (ESLint 9+), exporting `rules`,
`configs['go-no-go']`, and `configs.recommended`.

Most rules trace to the [coding charter](../flight-rules/docs/coding-charter.md)
(mandates `M-N`).

## Custom rules

These are implemented by the package.

### `no-loose-functions` — go-no-go

Loose (module-level) functions within files are disallowed, unless their name
carries an allowlisted suffix like `Schema` or `Validator` (covers zod
validators and similar). The suffix allowlist is user-configurable.

Needs custom code — the suffix allowlist isn't expressible in stock rules.

### `no-planning-identifiers` — go-no-go — (M-1)

Bans planning-system identifiers in comments and string literals: `Phase N`,
`D-NN` decision codes, `T-X-NN` threat codes, REQ-IDs (`SERV-NN`, `ERR-NN`,
`PAGE-NN`, …), `Pitfall N`, `RESEARCH §Q*`, `CONTEXT.md`, `PLAN.md`, `CR-NN`,
`WR-NN`, `IN-NN`, and prose like "from a previous phase" / "the next phase
will". The token/pattern list is user-configurable.

### `no-paragraph-comments` — go-no-go — (M-2)

Bans multi-line `// …` paragraph comments at file top and paragraph block
comments above non-declaration code. Concepts belong in JSDoc on the primary
declaration. Single-line why-this-line comments remain allowed.

### `no-throw-helpers` — go-no-go — (M-11)

Flags functions whose entire body is a single `throw`. Throw a named error
class inline at the call site instead.

### `no-switch-with-nested-if` — go-no-go — (M-10)

Flags a `switch` whose cases contain `if` statements. Flatten to if-else.

### `error-class-sets-name` — go-no-go

Classes extending `Error` (or a base error class) must set `name` /
`override name`. Reflects the error-class style in the charter's worked example.

### `service-shape` — recommended — (M-3)

Flags service-shaped concepts that deviate from `interface → class → optional
singleton`: `interface Foo` paired with a `defaultFoo` object-literal default,
or a `createFoo()` factory that returns a closure. May require light type info.

### `constructor-single-props` — recommended — (M-5)

Flags constructors that take more than one parameter (the `config, deps` split).
Optionally requires a `Schema.parse(props)` call at the constructor boundary.
May require light type info.

## Config-only ruleset entries

Both rulesets wire up stock `@typescript-eslint` / `unicorn` rules — no custom
code.

### Class ordering — both sets — (member-ordering)

```js
'@typescript-eslint/member-ordering': ['error', {
  default: {
    memberTypes: [
      'signature',
      'public-instance-field',
      'protected-instance-field',
      'private-instance-field',
      'constructor',
      'public-instance-method',
      'protected-instance-method',
      'private-instance-method',
      'public-static-field',
      'protected-static-field',
      'private-static-field',
    ],
    order: 'as-written',
  },
}]
```

### Naming convention — both sets — (M-3, M-7)

Includes the variable/type/static-property rules below, plus **no `I`-prefix on
interfaces** (M-3) and **camelCase object-literal keys** (M-7).

```js
'@typescript-eslint/naming-convention': ['error',
  { selector: 'variableLike', format: ['UPPER_CASE'], prefix: ['NULL_', 'UNKNOWN_'] },
  { selector: 'variableLike', format: ['camelCase'],
    filter: { regex: '^(?!NULL_|UNKNOWN_).*', match: true }, leadingUnderscore: 'allow' },
  { selector: 'typeLike', format: ['PascalCase'] },
  { selector: 'classProperty', modifiers: ['static'], format: ['UPPER_CASE'] },
]
```

### Filename case — both sets

`unicorn/filename-case` set to kebab-case, matching the directory-naming
convention (lowercase kebab-case, never PascalCase).

### Niceties — recommended only

- `no-default-exports` — named exports only, reinforcing M-3 naming discipline.
- `consistent-type-imports` — `import type` for type-only imports.
- `no-explicit-any`.

## Considered and deferred (too semantic to lint reliably)

- **M-4** — don't over-engineer DI seams.
- **M-6** — declarative parsing over procedural decoding.
- **M-8** — English method names (a configurable banned-verb list was proposed
  and declined).
- **M-9** — visual newline grouping in long methods.
- **M-12 / M-13** — README/doc and philosophy mandates.
