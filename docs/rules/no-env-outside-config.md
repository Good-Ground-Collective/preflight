# no-env-outside-config

Disallow `process.env` and `import.meta.env` outside configuration files.

## Rule details

Environment variables read across a codebase are untyped strings that every
reader has to validate, or forgets to. Reading them in one config module, and
parsing them once with a schema there, gives the rest of the code typed
settings and one place to see what the app needs.

The rule reports `process.env` (also `process['env']`, and `process` imported
from `node:process`) and `import.meta.env` in any file outside the `allow`
globs.

It is in `recommended` rather than `go-no-go` because scripts and tooling
legitimately read the environment.

### Incorrect

```ts
// src/server.ts
const port = Number(process.env.PORT);
```

### Correct

```ts
// src/config/env.ts
export const env = envSchema.parse(process.env);

// src/server.ts
import { env } from '#config/env.js';
const port = env.port;
```

## Options

### `allow`

`string[]`, default `['**/config/**', '**/*.config.ts']`.

Globs matched against the file path relative to the working directory.
Supports `*`, `**` and `?`. Setting it replaces the default list.

```json
{ "preflight/no-env-outside-config": ["error", { "allow": ["**/config/**", "**/*.config.ts", "scripts/**"] }] }
```
