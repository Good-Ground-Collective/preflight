# no-service-constructor-imports

Disallow project-local `make<CapabilityName>` imports outside test and spec
files.

> This rule presumes an [Effect](https://effect.website) service architecture.
> It ships in `recommended` rather than in the `go-no-go` gate, and is
> meaningless in a codebase that does not use Effect services — there it will
> flag any project-local `make<Something>` import. Turn it off if that is you.

## Rule details

An Effect service constructor carries the service's dependencies in its
signature. Importing one into runtime code pins those dependencies at the
import site, rather than letting them propagate through the effect's
requirements to the composition root where they can actually be provided. The
result is a module that cannot be wired differently for tests, for another
environment, or for a second caller.

The rule flags a named import whose **imported** name matches `make` followed by
a capital letter — `makeIssueService`, `makeUserStore` — from a project-local
specifier (one starting with `./` or `../`). The imported name is reported even
when the import is aliased.

Package imports are out of scope; only project-local modules are checked.

Files whose names end in `.test.` or `.spec.` (with any of the `js`, `jsx`,
`ts`, `tsx`, `cjs`, `mjs`, `cts`, `mts` extensions) are exempt, since
constructing a service directly is exactly what a test should do.

### Incorrect

```ts
// src/runtime.ts
import { makeIssueService } from './issue-service.ts';
import { makeIssueService as createIssueService } from '../issue-service.ts';
import { makeIssueService, makeUserService } from './services.ts';
```

### Correct

```ts
// src/runtime.ts

// Import the owning Layer and let requirements propagate.
import { issueServiceLayer } from './issue-service.ts';

// A package import is out of scope.
import { makeExecutionMemo } from 'alchemy/Runtime/ExecutionMemo';

// `make` must be followed by a capital to name a capability.
import { makeissueService } from './issue-service.ts';
```

```ts
// src/issue-service.test.ts — test files may construct services directly.
import { makeIssueService } from './issue-service.ts';
```

## Known trade-offs

The rule matches on naming convention alone. A project-local export named
`makeSomething` that is not an Effect service constructor — a plain factory
function, say — is reported, and a service constructor that does not follow the
convention is missed.

## Options

None.

## When not to use it

If your project does not use Effect services, turn this rule off. It is in
`recommended` rather than `go-no-go` for exactly that reason:

```js
export default [
  ...preflight.configs.recommended,
  { rules: { 'preflight/no-service-constructor-imports': 'off' } },
];
```

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
