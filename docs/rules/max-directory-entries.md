# max-directory-entries

Limit how many source files one folder may hold, so large folders get split
into subfolders.

## Rule details

This rule reads the filesystem. It counts the source files directly in the
linted file's folder, leaving out test files and anything in `__tests__/`.
When the count is over `max`, it reports once, at line 1 of the
alphabetically first source file in that folder, so one folder gives one
error rather than one per file.

The limit nudges code toward wide, nested hierarchies of small folders
without blocking ordinary ones.

```text
src/billing/  13 source files  ✗ Split it into subfolders, one per concept.
```

## Options

```js
'preflight/max-directory-entries': ['error', { max: 12 }]
```

| Option | Type | Default |
| --- | --- | --- |
| `max` | `integer` | `12` |

## When not to use it

Generated code or barrel-heavy folders may need a higher limit, or an
`ignores` entry.
