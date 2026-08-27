# no-known-value-widening

Disallow syntactically established values from flowing into explicitly broad or
anonymous target types that discard useful evidence.

## Rule details

`const config: Record<string, unknown> = { retries: 3, mode: 'fast' }` knew
exactly what it held until the annotation said otherwise. The literal carried a
precise type; the annotation replaced it with one that tells callers nothing.
Every read from `config` now needs narrowing that the code had for free a line
earlier.

The rule fires only where the evidence is **syntactically certain** — an object
or array literal, an arrow or function expression, a class expression, `new`, a
literal, or a template literal — including when that value reaches the
annotation through `const` bindings that are never reassigned.

The broad targets it recognises are `unknown`, `object`, an open dictionary
(`Record<K, V>`, an index signature, a mapped type), a generic container alias,
and an anonymous object literal type. Named types — interfaces and aliases that
resolve to a real shape — are not widening targets.

It checks these positions: variable declarators, class property definitions and
accessor properties, assignments to an annotated binding, `return` statements,
concise arrow bodies, and `as` / angle-bracket assertions.

An empty object literal assigned to a dictionary type is exempt: `const acc:
Record<string, T> = {}` is an accumulator being initialised, not evidence being
thrown away.

### Incorrect

```ts
const value: unknown = {};
const value: object = [];
let value: unknown;
value = {};

const commands: Record<string, Command> = { start: startCommand };
const commands: { [key: string]: Command } = { start: startCommand };
const commands: { start: Command } = { start: startCommand };
const commands = { start: startCommand } as Record<string, Command>;

class Registry {
  commands: Record<string, Command> = { start: startCommand };
}

function create(): Record<string, Command> {
  return { start: startCommand };
}

// Evidence traced through an intermediate `const`.
const source = { start: startCommand };
const commands: Record<string, Command> = source;
```

### Correct

```ts
// Keep inference.
const commands = { start: startCommand };

// Check the shape without discarding it.
const commands = { start: startCommand } satisfies Record<string, Command>;
const commands = { start: startCommand } as const satisfies Commands;

// Use a named owner contract.
interface Commands {
  readonly start: Command;
}
const commands: Commands = { start: startCommand };

// An empty accumulator is exempt.
const commands: Record<string, Command> = {};

// Nothing syntactically known about a call's result.
declare function make(): Record<string, Command>;
const commands: Record<string, Command> = make();
```

## Known trade-offs

Annotating a binding with a broad type is sometimes deliberate — pinning a
public constant to its declared contract, or widening so a later reassignment
type-checks. `satisfies` covers most of those cases, but not the ones where the
wider type is genuinely wanted.

## Options

None.

## When not to use it

If your codebase annotates most bindings by convention rather than relying on
inference, this rule will report a large fraction of them.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
