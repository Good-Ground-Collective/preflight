import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { rule } from '../../src/rules/no-reflect-get.js';

const ruleTester = new RuleTester();

ruleTester.run('no-reflect-get', rule, {
  valid: [
    // Ordinary property access is the whole point of the rule.
    'const value = owner.property;',
    // Computed access on a real object is fine; only Reflect.get is banned.
    'const value = owner[key];',
    // A sibling Reflect method this rule does not own.
    'Reflect.set(owner, key, value);',
    // A local binding shadows the global.
    'const Reflect = { get() { return 1; } }; Reflect.get();',
    // A parameter shadow likewise resolves to a definition.
    'function read(Reflect: { get(): number }) { return Reflect.get(); }',
    // Dynamic key: no statically known method name to match.
    'const value = Reflect[key](owner, prop);',
  ],
  invalid: [
    {
      // Dot notation on the global.
      code: 'const value = Reflect.get(owner, key);',
      errors: [{ messageId: 'reflectGet', type: AST_NODE_TYPES.CallExpression }],
    },
    {
      // String-literal computed access resolves to the same method name.
      code: "const value = Reflect['get'](owner, key);",
      errors: [{ messageId: 'reflectGet', type: AST_NODE_TYPES.CallExpression }],
    },
  ],
});
