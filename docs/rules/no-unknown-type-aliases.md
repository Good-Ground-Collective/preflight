# no-unknown-type-aliases

Disallow type aliases whose resolved type is `unknown`; `unknown` must remain
visible at an allowed boundary.

## Rule details

`type Payload = unknown` reads like a domain type at every use site while
carrying none of the guarantees of one. A parameter typed `Payload` looks
checked and is not. `unknown` is the right type in places — at a parsing
boundary, on an error's `cause` — but only where it is written plainly, so
readers can see what they are dealing with.

The rule flags a module-level type alias that resolves to `unknown`, following
alias-to-alias chains. Every link in a chain reports, since each one is a name
hiding the same thing.

Generic aliases are left alone: `type Box<T> = T` resolves per call site, and
this rule does not evaluate type arguments.

### Incorrect

```ts
type Payload = unknown;
export type Alias = unknown;

// Every link in the chain reports.
type UnknownValue = unknown;
type Payload = UnknownValue;
```

### Correct

```ts
// unknown written plainly at the boundary that receives it.
function parse(input: unknown): User {
  return decodeUser(input);
}

// unknown on an error cause, where the origin genuinely is unknown.
type Failure = { readonly message: string; readonly cause: unknown };

// A generic alias resolves per call site.
type Box<Value> = Value;
type Payload = Box<unknown>;
```

## Options

None.

## When not to use it

If your codebase deliberately names its top type — for example a `Json` alias
used at many boundaries — either rename it to something the rule does not
resolve to bare `unknown`, or disable this rule.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
