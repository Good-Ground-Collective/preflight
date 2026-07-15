# constructor-single-props

Require constructors to take a single props object instead of multiple parameters.

## Rule details

The coding charter (M-5) requires constructors to accept a single props object
(validated by a schema), banning the `constructor(config, deps)` split. Multiple
constructor parameters make call sites order-dependent and brittle, and they
resist the schema-validation pattern the charter prescribes.

This rule flags any constructor whose parameter list has more than one entry.
TypeScript parameter properties (`constructor(private a: A, private b: B)`) each
count as one parameter, so the shorthand form of the banned split is flagged too.

The check is pure AST — no type information is used — which makes it heuristic.
For that reason the rule belongs in the `recommended` config only (as `error`)
and is never part of the blocking `go-no-go` gate.

### Incorrect

```ts
class Service {
  constructor(config: Config, deps: Deps) {}
}
```

```ts
class Service {
  constructor(private config: Config, private deps: Deps) {}
}
```

```ts
class Service {
  constructor(private config: Config, deps: Deps) {}
}
```

### Correct

```ts
class Service {
  constructor(props: ServiceProps) {}
}
```

```ts
class Service {
  constructor(private readonly props: ServiceProps) {}
}
```

```ts
class Service {
  constructor() {}
}
```

```ts
// No constructor at all is fine.
class Service {}
```

## Options

This rule has no options.

## When not to use it

If a class must interoperate with an external framework that dictates a
multi-parameter constructor signature, disable the rule for that line with an
`eslint-disable-next-line` comment rather than turning it off project-wide.

## Further reading

- Charter M-5: constructors take a single schema-validated props object.
