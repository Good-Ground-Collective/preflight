# no-reflect-get

Disallow `Reflect.get`; use typed property access or parse dynamic input into a
domain type.

## Rule details

`Reflect.get(owner, key)` reads a property through a value-level indirection.
The key is an ordinary value rather than a checked property name, so the read
escapes whatever the owner's type says about its properties and yields `any`.
Ordinary property access — `owner.property`, or `owner[key]` where `key` is
typed — keeps that checking.

The rule flags a call whose callee reads the `get` property of the global
`Reflect`, written either as `Reflect.get(...)` or `Reflect['get'](...)`. A
local binding named `Reflect` shadows the global and is left alone, as is a
dynamic key such as `Reflect[method](...)`.

### Incorrect

```ts
const value = Reflect.get(owner, key);
const same = Reflect['get'](owner, key);
```

### Correct

```ts
const value = owner.property;

// A dynamic key is fine when it is typed.
const value = owner[key satisfies keyof Owner];

// Otherwise parse the payload into a domain type before reading it.
const owner = parseOwner(payload);
const value = owner.property;
```

## Options

None.

## When not to use it

If you are writing a `Proxy` handler or similar metaprogramming, where
forwarding an arbitrary key is the job, disable this rule for those files.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
