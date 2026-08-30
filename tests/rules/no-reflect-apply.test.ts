import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { rule } from '../../src/rules/no-reflect-apply.js';

const ruleTester = new RuleTester();

ruleTester.run('no-reflect-apply', rule, {
  valid: [
    // Function.prototype.apply on an ordinary value is a different call entirely.
    'const value = operation.apply(owner, args);',
    // A sibling Reflect method this rule does not own.
    'Reflect.get(owner, key);',
    // A local binding shadows the global, so this is not the global Reflect.
    'const Reflect = { apply() { return 1; } }; Reflect.apply();',
    // A parameter shadow likewise resolves to a definition, not the global.
    'function invoke(Reflect: { apply(): number }) { return Reflect.apply(); }',
    // Dynamic key: no statically known method name to match.
    'const value = Reflect[key](operation, owner, args);',
    // Reading the property without calling it is out of scope.
    'const fn = Reflect.apply;',
  ],
  invalid: [
    {
      // Dot notation on the global.
      code: 'const value = Reflect.apply(operation, owner, args);',
      errors: [
        { messageId: 'reflectApply', type: AST_NODE_TYPES.CallExpression },
      ],
    },
    {
      // String-literal computed access resolves to the same method name.
      code: "const value = Reflect['apply'](operation, owner, args);",
      errors: [
        { messageId: 'reflectApply', type: AST_NODE_TYPES.CallExpression },
      ],
    },
    {
      // A shadow that has gone out of scope leaves the global visible again.
      code: `function scoped() {
        const Reflect = { apply() { return 1; } };
        return Reflect.apply();
      }
      const value = Reflect.apply(operation, owner, args);`,
      errors: [
        { messageId: 'reflectApply', type: AST_NODE_TYPES.CallExpression },
      ],
    },
  ],
});
