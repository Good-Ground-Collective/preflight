# no-parent-relative-imports

Disallow `../` import specifiers; import across folders through a `#alias/`
subpath.

## Rule details

A `../` path encodes where the importing file sits. Every move breaks it, and a
reader has to count levels to know what it names. A subpath import declared in
the package's `imports` map names the target the same way from every file:

```json
{
  "imports": {
    "#models/*": "./src/models/*"
  }
}
```

The rule reports any relative specifier with a `..` segment — `../a.js`,
`../../a.js`, `..`, and `./nested/../a.js` — in static imports,
`export … from`, dynamic `import()`, `require()` and `import x = require()`.
Imports from the same folder or below (`./a.js`) are fine.

### Incorrect

```ts
import { User } from '../../models/user.js';
```

### Correct

```ts
import { User } from '#models/user.js';
import { helper } from './helper.js';
```

## Options

### `allow`

`string[]`, default `[]`.

Regular expressions. A specifier matching any of them is not reported.

```json
{ "preflight/no-parent-relative-imports": ["error", { "allow": ["^\\.\\./index\\.js$"] }] }
```

There is no built-in exemption. A `../index.js` barrel import and a test
reaching into `__tests__/support/` are both still paths that climb, and an
`imports` entry covers them as well as anything else.

## When not to use it

In a package that cannot use `imports` (a runtime or bundler without subpath
import support). [`no-upward-imports`](./no-upward-imports.md) still stops
imports leaving the package.
