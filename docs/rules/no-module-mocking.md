# no-module-mocking

Disallow Vitest and Jest module mocking; tests must replace dependencies through
real interfaces.

## Rule details

`vi.mock('./user-store')` replaces a dependency by rewriting the module graph.
The code under test is never asked to accept a substitute, so the test proves
nothing about the seam the production code actually uses — and the mock drifts
silently when the real module's exports change.

The rule flags calls to `mock`, `doMock`, and `unstable_mockModule` on the
`vi` or `jest` object, whether that object is the framework global or imported
from `vitest` / `@jest/globals`. An import matched on the name it was imported
*as* still counts, so a local alias does not evade the rule:

```ts
import { vi as testApi } from 'vitest';
testApi.mock('./user-store'); // still reported
```

A local binding named `vi` or `jest` that is not the framework object is left
alone, as is a dynamic method key. Other framework methods — `vi.spyOn`,
`vi.stubGlobal`, `vi.fn` — are not this rule's concern; they do not rewrite the
module graph.

### Incorrect

```ts
vi.mock('./user-store');
jest.mock('./user-store');
vi['doMock']('./user-store');
jest.unstable_mockModule('./user-store');
```

### Correct

```ts
// Inject the dependency through the interface production code uses.
interface UserStore {
  save(user: User): Promise<void>;
}

class InMemoryUserStore implements UserStore {
  readonly saved: User[] = [];
  async save(user: User) {
    this.saved.push(user);
  }
}

const service = new UserService(new InMemoryUserStore());
```

## Known trade-offs

Some dependencies have no injectable seam — a module that reads the clock at
import time, or a third-party package with only a default export of side
effects. Introducing a seam for those is real work, and this rule reports the
existing mock before that work is done.

## When not to use it

If your codebase relies on module mocking as its primary test-isolation
strategy, adopt this rule per-directory as seams are introduced rather than
repository-wide.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
