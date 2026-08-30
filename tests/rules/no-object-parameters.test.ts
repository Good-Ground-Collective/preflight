import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-object-parameters.js';

const ruleTester = new RuleTester();

ruleTester.run('no-object-parameters', rule, {
  valid: [
    // The alias declaration itself is not a parameter.
    'type Alias = object;',
    // No alias in scope, so the reference resolves to nothing broad.
    'function f(value: Alias) {}',
    'interface Owner { readonly id: string } function f(value: Owner) {}',
    // A bare type parameter is not `object`.
    'function f<Value>(value: Value) {}',
    // A constraint is not the parameter's own type.
    'function f<Value extends object>(value: Value) {}',
    'function f<Value extends Owner, Owner extends { readonly id: string }>(value: Value) {}',
    'type Owner = { readonly id: string }; function f<Value extends Owner>(value: Value) {}',
    // A type parameter shadows the module alias of the same name.
    'type Alias = object; function consume<Alias>(value: Alias) {}',
    'type Alias = object; type Consumer<Alias> = (value: Alias) => void;',
    'type Alias = object; interface Consumer<Alias> { consume(value: Alias): void }',
    // A mapped type's key shadows the module alias within its value type.
    'type Key = object; type Mapped<Input> = { [Key in keyof Input]: (value: Key) => void };',
    // An `infer` binder shadows the module alias in the conditional's true branch.
    'type Item = object; type Unpacked<Input> = Input extends Promise<infer Item> ? (value: Item) => void : never;',
    // A generic alias resolves per call site, so it is not indexed.
    'type Alias<Value> = object; function f(value: Alias<string>) {}',
  ],
  invalid: [
    {
      code: 'function f(value: object) {}',
      errors: [{ messageId: 'objectParameter', data: { parameter: 'value' } }],
    },
    {
      // Resolved through a module-level alias.
      code: 'type Alias = object; function f(value: Alias) {}',
      errors: [{ messageId: 'objectParameter', data: { parameter: 'value' } }],
    },
    {
      // Parentheses are absent from the AST, so this is the plain case.
      code: 'type Alias = (object); function f(value: Alias) {}',
      errors: [{ messageId: 'objectParameter', data: { parameter: 'value' } }],
    },
    {
      // An `infer` binder is not visible in the conditional's false branch, so
      // the module alias applies there.
      code: 'type Item = object; type Fallback<Input> = Input extends infer Item ? string : (value: Item) => void;',
      errors: [{ messageId: 'objectParameter', data: { parameter: 'value' } }],
    },
    {
      // An alias chain still bottoms out in `object`.
      code: 'type A = object; type B = A; function f(value: B) {}',
      errors: [{ messageId: 'objectParameter', data: { parameter: 'value' } }],
    },
    {
      // A union is as broad as its broadest member.
      code: 'function f(value: string | object) {}',
      errors: [{ messageId: 'objectParameter', data: { parameter: 'value' } }],
    },
    {
      // Method signatures are covered.
      code: 'interface Handler { handle(value: object): void }',
      errors: [{ messageId: 'objectParameter', data: { parameter: 'value' } }],
    },
    {
      // A destructured parameter has no name, so its source text stands in.
      code: 'function f({ id }: object) {}',
      errors: [{ messageId: 'objectParameter', data: { parameter: '{ id }' } }],
    },
  ],
});
