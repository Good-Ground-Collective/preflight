# no-planning-identifiers

Disallow planning-system identifiers (phase numbers, ticket IDs, plan-file names) in comments and strings.

## Rule details

Planning-system identifiers — `Phase 2`, `D-09`, `T-4-05`, REQ-IDs, `PLAN.md`, "from a previous phase" — leak into source comments and strings, where they outlive the planning systems that gave them meaning. A reader six months later has no `PLAN.md` to consult and no idea what `D-09` was. The charter (M-1) bans them; this rule catches them mechanically before review.

The rule scans:

- **Line and block comments** — each match is reported at its exact location inside the comment, with a *suggestion* to remove the whole comment. The suggestion is never applied automatically: removing a comment can destroy legitimate content, so a human must accept it.
- **String literals and template literals** — each match is reported on the literal, with *no* fix or suggestion: rewriting a string can change runtime behavior (it may be a runtime key, user-facing message, etc.).

ESLint directive comments (`// eslint-disable-next-line …`, `/* eslint-disable … */`, and other comments starting with `eslint`) are exempt, since they legitimately reference lint machinery — and are also how you silence an intentional occurrence.

### Default patterns

The following patterns are always active:

| Pattern | Catches |
| --- | --- |
| `Phase \d` | `Phase 2`, `Phase 3 cleanup` |
| `D-\d\d` | `D-09` |
| `T-\d-\d\d` | `T-4-05` |
| `[A-Z]{3,}-\d\d` | REQ/ticket-style IDs: `REQ-42`, `KAN-20` |
| `PLAN\.md` | `PLAN.md` |
| `CONTEXT\.md` | `CONTEXT.md` |
| `from a previous phase` | "carried over from a previous phase" |

The defaults are kept deliberately specific (digits required, exact file names) so prose and ordinary identifiers don't trip them. Note that `[A-Z]{3,}-\d\d` matches *any* uppercase-prefix ticket-style ID with two or more trailing digits — including tags such as `TODO-42`. If a hit is intentional, suppress it with an ESLint directive rather than weakening the pattern.

## Examples

### Incorrect

```ts
// resolves D-09 open redirect
const redirect = sanitize(url);

/* Phase 2: wire the adapters */
export const adapters = [];

// satisfies REQ-42
const doc = 'see PLAN.md';

const note = `carried over from a previous phase`;
```

### Correct

```ts
// implements the parser
const parser = build();

// sanitize before redirecting: raw URLs allow open redirects
const redirect = sanitize(url);

const label = 'phase one of the moon'; // prose without a digit does not match
```

## Options

```jsonc
{
  "preflight/no-planning-identifiers": [
    "error",
    { "patterns": ["TICKET-\\d+", "sprint \\d+"] }
  ]
}
```

- `patterns` (`string[]`, default `[]`) — additional regular expressions (as strings, compiled with the `g` flag) to flag. User patterns **extend** the built-in defaults; they never replace them. An invalid regular expression throws a configuration error naming the offending pattern.

## When not to use it

If your team deliberately keeps ticket references in code (e.g. a policy of linking commits to an issue tracker via source comments), disable this rule or suppress individual hits with `eslint-disable` directives.
