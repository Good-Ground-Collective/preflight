import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../src/rules/error-class-sets-name.js';

const ruleTester = new RuleTester();

ruleTester.run('error-class-sets-name', rule, {
  valid: [
    // Sets `name` via a property definition.
    "class FooError extends Error { override name = 'FooError'; }",
    // Sets `name` via a plain (non-override) property definition.
    "class FooError extends Error { name = 'FooError'; }",
    // Sets `name` in the constructor.
    `class FooError extends Error {
  constructor() {
    super();
    this.name = 'FooError';
  }
}`,
    // Custom error-like base, name set.
    "class BarError extends AppError { override name = 'BarError'; }",
    // No superclass at all.
    'class Plain {}',
    // Superclass is not error-like.
    'class Widget extends Component {}',
    // Non-identifier superclass is out of scope for this AST-only rule.
    'class OddError extends bases.Error {}',
    // Class expression that sets name.
    "const E = class extends Error { override name = 'E'; };",
    // Anonymous class expression whose constructor assigns this.name.
    `const F = class extends Error {
  constructor() {
    super();
    this.name = 'F';
  }
};`,
  ],
  invalid: [
    // Empty body, extends Error directly.
    {
      code: 'class FooError extends Error {}',
      errors: [{ messageId: 'missingName', data: { name: 'FooError' } }],
      output: `class FooError extends Error {
  override name = 'FooError';}`,
    },
    // Error-like custom base (name ends in "Error").
    {
      code: 'class BarError extends AppError {}',
      errors: [{ messageId: 'missingName', data: { name: 'BarError' } }],
      output: `class BarError extends AppError {
  override name = 'BarError';}`,
    },
    // Non-empty body: the field is inserted right after `{`, before members.
    {
      code: `class BazError extends Error {
  constructor(message: string) {
    super(message);
  }
}`,
      errors: [{ messageId: 'missingName', data: { name: 'BazError' } }],
      output: `class BazError extends Error {
  override name = 'BazError';
  constructor(message: string) {
    super(message);
  }
}`,
    },
    // A static `name` member does not set the instance name.
    {
      code: "class StatError extends Error { static nameTag = 'StatError'; }",
      errors: [{ messageId: 'missingName', data: { name: 'StatError' } }],
      output: `class StatError extends Error {
  override name = 'StatError'; static nameTag = 'StatError'; }`,
    },
    // A computed ['name'] key is not recognized (shallow AST heuristic).
    {
      code: "class CompError extends Error { ['name'] = 'CompError'; }",
      errors: [{ messageId: 'missingName', data: { name: 'CompError' } }],
      output: `class CompError extends Error {
  override name = 'CompError'; ['name'] = 'CompError'; }`,
    },
    // Named class expression: name comes from the class's own id.
    {
      code: 'const make = () => class QuxError extends Error {};',
      errors: [{ messageId: 'missingName', data: { name: 'QuxError' } }],
      output: `const make = () => class QuxError extends Error {
                     override name = 'QuxError';};`,
    },
    // Anonymous class expression assigned to a variable: name comes from the
    // variable declarator.
    {
      code: 'const QuxError = class extends Error {};',
      errors: [{ messageId: 'missingName', data: { name: 'QuxError' } }],
      output: `const QuxError = class extends Error {
                   override name = 'QuxError';};`,
    },
    // Truly anonymous class expression: reported, but no fix is offered.
    {
      code: 'throw new (class extends Error {})();',
      errors: [{ messageId: 'missingName', data: { name: '<anonymous>' } }],
      output: null,
    },
    // Anonymous default export: reported, but no fix is offered.
    {
      code: 'export default class extends Error {}',
      errors: [{ messageId: 'missingName', data: { name: '<anonymous>' } }],
      output: null,
    },
    // Space-indented fixture (nested four spaces deep).
    {
      code: `function makeSpace() {
    class SpaceError extends Error {}
}`,
      errors: [{ messageId: 'missingName', data: { name: 'SpaceError' } }],
      output: `function makeSpace() {
    class SpaceError extends Error {
      override name = 'SpaceError';}
}`,
    },
    // Tab-indented fixture (indent is a best-effort column guess; a formatter
    // normalizes the result).
    {
      code: `function makeTab() {
\tclass TabError extends Error {}
}`,
      errors: [{ messageId: 'missingName', data: { name: 'TabError' } }],
      output: `function makeTab() {
\tclass TabError extends Error {
   override name = 'TabError';}
}`,
    },
  ],
});
