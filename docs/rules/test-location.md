# test-location

Require tests to sit in a `__tests__/` folder beside their code, never in a
repo-level test tree.

## Rule details

This rule reads the filesystem and reports once per file, at line 1. Paths are
relative to the nearest `package.json`. A test file is one named
`*.test.*` or `*.spec.*`.

With `style: 'tests-folder'` (the default):

- Every test file is in a `__tests__/` folder.
- That folder's parent holds source code (a non-test source file or another
  folder), so the tests sit beside what they cover.
- There are no folders inside `__tests__/` other than `allowedSubfolders`.
- A non-test source file inside `__tests__/` must be in one of the
  `allowedSubfolders`.

With `style: 'adjacent'`, tests sit beside their source (`foo.ts` +
`foo.test.ts`), and a test inside `__tests__/` is reported.

In both styles, no test file may sit under any of the `forbiddenRoots`.

### Incorrect

```text
tests/audit.test.ts                                  ✗ under a forbidden root
src/__tests__/audit.test.ts                          ✗ under a forbidden root
src/audit/services/schedule/schedule-builder.test.ts ✗ Expected …/schedule/__tests__/schedule-builder.test.ts
src/audit/services/schedule/__tests__/unit/a.test.ts ✗ 'unit' is not an allowed subfolder
src/audit/services/schedule/__tests__/helpers.ts     ✗ not a test
```

### Correct

```text
src/audit/services/schedule/__tests__/schedule-builder.test.ts
src/audit/__tests__/audit-flow.integration.test.ts
src/audit/__tests__/support/audit-builder.ts
```

## Options

```js
'preflight/test-location': ['error', {
  style: 'tests-folder',
  forbiddenRoots: ['test', 'tests', 'src/__tests__'],
  allowedSubfolders: ['support', 'fixtures'],
}]
```

| Option | Type | Default |
| --- | --- | --- |
| `style` | `'tests-folder' \| 'adjacent'` | `'tests-folder'` |
| `forbiddenRoots` | `string[]` | `['test', 'tests', 'src/__tests__']` |
| `allowedSubfolders` | `string[]` | `['support', 'fixtures']` |

## When not to use it

A repo with a legacy top-level `test/` tree fails `forbiddenRoots` until it
migrates. Until then, add an `ignores` entry for that tree in your own config
rather than changing the rule's options.
