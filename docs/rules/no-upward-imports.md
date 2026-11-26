# no-upward-imports

Disallow relative imports that resolve outside the package root.

## Rule details

The package root is the nearest folder above the linted file that holds a
`package.json`. A relative specifier that resolves outside it reaches into
another package's source instead of its published entry point: the dependency
never appears in `package.json`, bypasses the other package's `exports`, and
breaks as soon as the packages are built or moved apart.

The rule checks static imports, `export … from`, dynamic `import()`,
`require()` and `import x = require()`. Only string specifiers are checked.
A file with no `package.json` anywhere above it is not checked.

This is the one rule in the shared configs that reads the filesystem: it looks
up `package.json` once per folder and caches the answer for the run.

### Incorrect

```ts
// packages/web/src/app.ts
import { Button } from '../../ui/src/button.js';
```

### Correct

```ts
// packages/web/src/app.ts
import { Button } from '@acme/ui';
```

## Options

None.

## When not to use it

In a repo that deliberately shares source across package boundaries without
publishing it, such as a single build that happens to contain several
`package.json` files for tooling only.
