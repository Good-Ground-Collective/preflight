# test-file-naming

Require test files to use an allowed suffix and to be named for the source file
they cover.

## Rule details

This rule reads the filesystem and reports once per file, at line 1.

- A test file must end in one of the `suffixes`, so `.spec.ts` is reported by
  default.
- With `matchSource: 'concept'`, a test directly inside a concept's
  `__tests__/` must be named `<sibling>.<suffix>.ts`, where `<sibling>` is a
  source file in the folder that holds `__tests__/`. A module-level
  `__tests__/` is exempt, since that is where integration and cross-concept
  tests go under any name. The rule recognizes module folders through the
  `module` option, which takes the same `marker` / `match` settings as
  [`module-layout`](module-layout.md). Without it, every `__tests__/` is
  treated as a concept's.

Tests that sit beside their source rather than in `__tests__/`, and files in
`__tests__/` subfolders, are not matched against a source.

### Incorrect

```text
services/schedule/__tests__/schedule-builder.spec.ts ✗ not an allowed suffix
services/schedule/__tests__/scheduler.test.ts        ✗ no scheduler.ts in schedule/
```

### Correct

```text
services/schedule/schedule-builder.ts
services/schedule/__tests__/schedule-builder.test.ts
services/schedule/__tests__/schedule-builder.integration.test.ts
```

## Options

```js
'preflight/test-file-naming': ['error', {
  suffixes: ['test', 'integration.test', 'e2e.test'],
  matchSource: 'concept',
  module: { marker: 'module.ts' },
}]
```

| Option | Type | Default |
| --- | --- | --- |
| `suffixes` | `string[]` | `['test', 'integration.test', 'e2e.test']` |
| `matchSource` | `'concept' \| 'off'` | `'concept'` |
| `module` | `{ marker?: string; match?: string }` | none |

## When not to use it

If tests are routinely named for behaviours rather than files, set
`matchSource: 'off'` and keep only the suffix check.
