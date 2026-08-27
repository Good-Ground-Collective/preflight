# no-object-parameters

Disallow `object` function parameters; inputs must use an owner-provided type
and be parsed at their boundary.

## Rule details

`object` says a value is not a primitive, and nothing else. A parameter typed
that way accepts any array, any function, any class instance, and any literal —
while reading as though it has been constrained. The signature communicates a
restriction it does not enforce.

The rule flags a parameter whose annotation resolves to `object`, following
module-level type aliases and treating a union as being as broad as its
broadest member. It covers functions, arrow functions, methods, constructors,
call and construct signatures, standalone function types, and ambient
declarations.

Type binders that shadow an alias name are respected — a type parameter, a
mapped type's key, or an `infer` binder — so a local `Value` is never resolved
against an unrelated module alias of the same name. Generic aliases resolve per
call site and are left alone.

A *constraint* is not the parameter's own type: `function f<T extends object>(v: T)`
is not reported.

### Incorrect

```ts
function f(value: object) {}
function f(value: string | object) {}
interface Handler {
  handle(value: object): void;
}

type Alias = object;
function f(value: Alias) {}

type A = object;
type B = A;
function f(value: B) {}
```

### Correct

```ts
// A named owner type.
interface Owner {
  readonly id: string;
}
function f(value: Owner) {}

// A bare type parameter is not `object` …
function f<Value>(value: Value) {}
// … and neither is a constraint.
function f<Value extends object>(value: Value) {}

// A type parameter shadows the module alias of the same name.
type Alias = object;
function consume<Alias>(value: Alias) {}
```

## Known trade-offs

`object` is the correct type in a few places — as the key type of a `WeakMap`,
or in a guard distinguishing objects from primitives. Those parameters are
reported.

## Options

None.

## When not to use it

If you are writing generic utilities whose contract really is "any non-primitive",
disable this rule for those files.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
