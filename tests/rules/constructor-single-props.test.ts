import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/constructor-single-props.js';

const ruleTester = new RuleTester();

ruleTester.run('constructor-single-props', rule, {
  valid: [
    // Single ordinary parameter.
    `
      class Foo {
        constructor(props: FooProps) {}
      }
    `,
    // Single TS parameter property.
    `
      class Foo {
        constructor(private props: FooProps) {}
      }
    `,
    // Single readonly parameter property.
    `
      class Foo {
        constructor(private readonly props: FooProps) {}
      }
    `,
    // Single destructured parameter.
    `
      class Foo {
        constructor({ config, deps }: FooProps) {}
      }
    `,
    // Single parameter with a default value.
    `
      class Foo {
        constructor(props: FooProps = {}) {}
      }
    `,
    // Zero parameters.
    `
      class Foo {
        constructor() {}
      }
    `,
    // No constructor at all.
    `
      class Foo {
        run(a: number, b: number) {}
      }
    `,
    // Ordinary methods with many parameters are not constructors.
    `
      class Foo {
        build(config: Config, deps: Deps) {}
        static create(config: Config, deps: Deps) {}
      }
    `,
    // Class expression, single parameter.
    `
      const Foo = class {
        constructor(props: FooProps) {}
      };
    `,
    // Loose function named constructor-ish things are irrelevant.
    `
      function constructorLike(a: number, b: number) {}
    `,
  ],
  invalid: [
    // The classic banned split: constructor(config, deps).
    {
      code: `
        class Foo {
          constructor(config: Config, deps: Deps) {}
        }
      `,
      errors: [{ messageId: 'multipleParams' }],
    },
    // TS parameter-property shorthand — each TSParameterProperty counts.
    {
      code: `
        class Foo {
          constructor(private a: A, private b: B) {}
        }
      `,
      errors: [{ messageId: 'multipleParams' }],
    },
    // Mixed parameter property and ordinary parameter.
    {
      code: `
        class Foo {
          constructor(private a: A, b: B) {}
        }
      `,
      errors: [{ messageId: 'multipleParams' }],
    },
    // Three parameters.
    {
      code: `
        class Foo {
          constructor(a: A, b: B, c: C) {}
        }
      `,
      errors: [{ messageId: 'multipleParams' }],
    },
    // Rest parameter alongside a named parameter still counts as two.
    {
      code: `
        class Foo {
          constructor(props: FooProps, ...rest: unknown[]) {}
        }
      `,
      errors: [{ messageId: 'multipleParams' }],
    },
    // Class expression constructor is flagged too.
    {
      code: `
        const Foo = class {
          constructor(config: Config, deps: Deps) {}
        };
      `,
      errors: [{ messageId: 'multipleParams' }],
    },
    // Plain JavaScript (no type annotations) is flagged the same.
    {
      code: `
        class Foo {
          constructor(config, deps) {}
        }
      `,
      errors: [{ messageId: 'multipleParams' }],
    },
  ],
});
