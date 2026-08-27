# no-unknown-parameters

Disallow explicitly `unknown` function parameters except `cause`; decode
unknown input at its I/O boundary instead.

## Rule details

A parameter typed `unknown` moves the decoding burden onto every caller and
leaves the function unable to say what it accepts. The signature documents
nothing, and each call site has to establish the same facts again.

The rule flags any parameter whose annotation is exactly `unknown`, across
functions, arrow functions, methods, constructors, call and construct
signatures, standalone function types, and ambient declarations. Parameter
properties, defaults, and rest elements are unwrapped to the annotation they
carry.

A parameter named `cause` is exempt: error enrichment genuinely receives values
of unknown origin, and `Error`'s own `cause` is typed that way.

An *unannotated* parameter is not an explicit `unknown` and is not reported —
that is `noImplicitAny`'s business.

### Incorrect

```ts
function handle(value: unknown) {}
const handle = (value: unknown) => {};
function handle(value: unknown = null) {}
function handle(...values: unknown) {}
interface Handler {
  handle(value: unknown): void;
}
type Handler = (value: unknown) => void;
class Store {
  constructor(private readonly value: unknown) {}
}
```

### Correct

```ts
// Accept the domain type; parse before calling.
function handle(event: DomainEvent) {}

// `cause` is the sanctioned exception.
function wrap(message: string, cause: unknown) {}

// The boundary function is where `unknown` belongs.
function parse(input: unknown): DomainEvent {
  return decodeDomainEvent(input);
}
```

## Known trade-offs

The exemption is by parameter *name*, not by position or type, so a parameter
that plays the cause role under another name (`originalError`, `reason`) is
still reported.

Generic library code that legitimately accepts arbitrary values — a logger, a
serializer, an assertion helper — will be reported. Those signatures are often
better expressed with a type parameter, but not always.

## Options

None.

## When not to use it

If you are writing a library whose contract is to accept caller-supplied values
of any shape, disable this rule for its public surface.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
