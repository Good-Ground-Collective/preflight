import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-unknown-parameters.js';

const ruleTester = new RuleTester();

ruleTester.run('no-unknown-parameters', rule, {
  valid: [
    // A named domain type is the whole point.
    'function save(user: User) {}',
    // `cause` is the sanctioned exception, for error enrichment.
    'function wrap(message: string, cause: unknown) {}',
    // An unannotated parameter is not an *explicit* `unknown`.
    'function handle(value) {}',
    // `unknown` in a return position is a different rule's concern.
    'function parse(input: string): unknown { return decode(input); }',
    // `unknown` as a type argument, not a parameter annotation.
    'function collect(values: ReadonlyArray<unknown>) {}',
    // A class constructor taking a domain type.
    'class Store { constructor(private readonly client: Client) {} }',
  ],
  invalid: [
    {
      code: 'function handle(value: unknown) {}',
      errors: [{ messageId: 'unknownParameter', data: { parameter: 'value' } }],
    },
    {
      // Arrow functions are covered.
      code: 'const handle = (value: unknown) => {};',
      errors: [{ messageId: 'unknownParameter', data: { parameter: 'value' } }],
    },
    {
      // A default value does not hide the annotation.
      code: 'function handle(value: unknown = null) {}',
      errors: [{ messageId: 'unknownParameter', data: { parameter: 'value' } }],
    },
    {
      // Rest parameters carry their annotation on the element type.
      code: 'function handle(...values: unknown) {}',
      errors: [
        { messageId: 'unknownParameter', data: { parameter: 'values' } },
      ],
    },
    {
      // Interface method signatures are covered.
      code: 'interface Handler { handle(value: unknown): void }',
      errors: [{ messageId: 'unknownParameter', data: { parameter: 'value' } }],
    },
    {
      // Standalone function types are covered.
      code: 'type Handler = (value: unknown) => void;',
      errors: [{ messageId: 'unknownParameter', data: { parameter: 'value' } }],
    },
    {
      // Parameter properties are unwrapped to the parameter they declare.
      code: 'class Store { constructor(private readonly value: unknown) {} }',
      errors: [{ messageId: 'unknownParameter', data: { parameter: 'value' } }],
    },
    {
      // Only the non-`cause` parameter reports.
      code: 'function wrap(detail: unknown, cause: unknown) {}',
      errors: [
        { messageId: 'unknownParameter', data: { parameter: 'detail' } },
      ],
    },
    {
      // A destructured parameter has no name, so its source text stands in.
      code: 'function handle({ id }: unknown) {}',
      errors: [
        { messageId: 'unknownParameter', data: { parameter: '{ id }' } },
      ],
    },
  ],
});
