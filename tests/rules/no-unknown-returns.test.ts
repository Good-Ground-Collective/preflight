import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-unknown-returns.js';

const ruleTester = new RuleTester();
const error = { messageId: 'unknownReturn' as const };

ruleTester.run('no-unknown-returns', rule, {
  valid: [
    // The alias declaration itself is not a return contract.
    'type ImportedValue = unknown;',
    // No alias in scope, so the reference resolves to nothing broad.
    'function parse(): ImportedValue { return input; }',
    'function parse(): User { return user; }',
    // An inferred return type carries no explicit `unknown` contract.
    'function infer() { return input; }',
    // A bare type parameter is not `unknown`.
    'function generic<Value>(): Value { return value; }',
    // A type parameter shadows the module alias of the same name.
    'type Value = unknown; function generic<Value>(): Value { return value; }',
    // A mapped type's key shadows the module alias within its value type.
    'type Key = unknown; type Mapped<Input> = { [Key in keyof Input]: () => Key };',
    // An `infer` binder shadows the module alias in the true branch.
    'type Item = unknown; type Unpacked<Input> = Input extends Promise<infer Item> ? () => Item : never;',
    // `unknown` nested on a property is not the return contract itself.
    'function cause(): { cause: unknown } { return { cause: input }; }',
    'type Result = { value: unknown }; function load(): Result { return result; }',
    // A resolved promise of a domain type.
    'function load(): Promise<User> { return promise; }',
  ],
  invalid: [
    { code: 'function load(): unknown { return input; }', errors: [error] },
    // Arrow functions are covered.
    { code: 'const load = (): unknown => input;', errors: [error] },
    // Standalone function types are covered.
    { code: 'type Loader = () => unknown;', errors: [error] },
    // Interface method signatures are covered.
    { code: 'interface Loader { load(): unknown }', errors: [error] },
    // Ambient declarations are covered.
    { code: 'declare function load(): unknown;', errors: [error] },
    // A union is as broad as its broadest member.
    {
      code: 'function load(): string | unknown { return input; }',
      errors: [error],
    },
    // `Promise<unknown>` exposes `unknown` just as plainly.
    {
      code: 'function load(): Promise<unknown> { return promise; }',
      errors: [error],
    },
    // Resolved through a module-level alias.
    {
      code: 'type UnknownValue = unknown; function load(): UnknownValue { return input; }',
      errors: [error],
    },
    // An `infer` binder is not visible in the conditional's false branch.
    {
      code: 'type Item = unknown; type Fallback<Input> = Input extends infer Item ? string : () => Item;',
      errors: [error],
    },
  ],
});
