import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/service-shape.js';

const ruleTester = new RuleTester();

ruleTester.run('service-shape', rule, {
  valid: [
    // The charter shape: interface → class → optional singleton.
    `
      interface Foo {
        run(): void;
      }
      class MemoryFoo implements Foo {
        run(): void {}
      }
      export const foo: Foo = new MemoryFoo();
    `,
    // Factory returning a class instance is fine.
    `
      class Foo {}
      function createFoo() {
        return new Foo();
      }
    `,
    // Concise arrow factory returning a class instance.
    `
      class Bar {}
      const createBar = () => new Bar();
    `,
    // Indirect return of a class instance (def-use trace to a NewExpression).
    `
      class Foo {}
      function createFoo() {
        const svc = new Foo();
        return svc;
      }
    `,
    // Re-export alias is not a factory body we can judge — never flagged.
    `
      declare function createFooImpl(): unknown;
      export const createFoo = createFooImpl;
    `,
    // default* binding whose annotation is not a locally declared interface.
    `
      import type { Options } from './options';
      const defaultOptions: Options = { retries: 3 };
    `,
    // default* binding typed by a local type alias, not an interface.
    `
      type Config = { retries: number };
      const defaultConfig: Config = { retries: 3 };
    `,
    // default* binding without an object-literal initializer.
    `
      interface Foo {
        run(): void;
      }
      declare function makeFoo(): Foo;
      const defaultFoo: Foo = makeFoo();
    `,
    // Non-object default value is fine.
    `
      const defaultRetries = 3;
    `,
    // Names that do not match the heuristics are ignored entirely.
    `
      interface Foo {}
      const fallbackFoo: Foo = {};
      function buildFoo() {
        return {};
      }
    `,
    // Factory returning something other than a literal/closure/new is left alone.
    `
      declare function resolve(): unknown;
      function createFoo() {
        return resolve();
      }
    `,
  ],
  invalid: [
    // (a) interface + defaultFoo object-literal via type annotation.
    {
      code: `
        interface Foo {
          run(): void;
        }
        const defaultFoo: Foo = { run() {} };
      `,
      errors: [{ messageId: 'defaultLiteral', data: { name: 'defaultFoo', interfaceName: 'Foo' } }],
    },
    // (a) empty literal still counts.
    {
      code: `
        interface Foo {}
        const defaultFoo: Foo = {};
      `,
      errors: [{ messageId: 'defaultLiteral' }],
    },
    // (a) via `as` assertion instead of an annotation.
    {
      code: `
        interface Foo {}
        const defaultFoo = {} as Foo;
      `,
      errors: [{ messageId: 'defaultLiteral' }],
    },
    // (a) via `satisfies`.
    {
      code: `
        interface Foo {}
        const defaultFoo = {} satisfies Foo;
      `,
      errors: [{ messageId: 'defaultLiteral' }],
    },
    // (a) exported declaration and exported interface.
    {
      code: `
        export interface Foo {}
        export const defaultFoo: Foo = {};
      `,
      errors: [{ messageId: 'defaultLiteral' }],
    },
    // (b) function declaration factory returning an object literal.
    {
      code: `
        function createFoo() {
          return { do() {} };
        }
      `,
      errors: [{ messageId: 'factoryLiteral', data: { name: 'createFoo', kind: 'an object literal' } }],
    },
    // (b) concise arrow factory returning a closure.
    {
      code: `
        const createBar = () => () => {};
      `,
      errors: [{ messageId: 'factoryLiteral', data: { name: 'createBar', kind: 'a function closure' } }],
    },
    // (b) function expression factory returning a function expression.
    {
      code: `
        const createQux = function () {
          return function () {};
        };
      `,
      errors: [{ messageId: 'factoryLiteral' }],
    },
    // (b) indirect return traced to an object-literal initializer.
    {
      code: `
        function createBaz() {
          const svc = { run() {} };
          return svc;
        }
      `,
      errors: [{ messageId: 'factoryLiteral' }],
    },
    // (b) arrow factory with a block body returning an object literal.
    {
      code: `
        const createSvc = () => {
          return { ok: true };
        };
      `,
      errors: [{ messageId: 'factoryLiteral' }],
    },
  ],
});
