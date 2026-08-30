# no-reflect-apply

Disallow `Reflect.apply`; call typed functions directly or model dynamic
dispatch behind an interface.

## Rule details

`Reflect.apply(fn, thisArg, args)` invokes a function through a value-level
indirection. The call site passes its arguments as an array, so TypeScript
checks them against `unknown[]` rather than against the function's parameters,
and the return type degrades with it. Whatever the direct call would have
caught, this call does not.

The rule flags a call whose callee reads the `apply` property of the global
`Reflect`, written either as `Reflect.apply(...)` or `Reflect['apply'](...)`. A
local binding named `Reflect` shadows the global and is left alone, as is a
dynamic key such as `Reflect[method](...)`, which names no method statically.

`Function.prototype.apply` — `fn.apply(owner, args)` — is a different call and
is not this rule's concern.

### Incorrect

```ts
const result = Reflect.apply(handler, owner, args);
const same = Reflect['apply'](handler, owner, args);
```

### Correct

```ts
// Call the function directly, and the compiler checks the arguments.
const result = handler(owner, ...args);

// Model genuinely dynamic dispatch behind a named contract.
interface Dispatcher {
  invoke(command: Command): Result;
}
```

## Options

None.

## When not to use it

If you are writing a proxy, a decorator library, or another piece of
metaprogramming where forwarding an unknown argument list is the actual job,
disable this rule for those files.

## Attribution

Ported from [anti-slop](https://github.com/dmmulroy/anti-slop) (MIT).
