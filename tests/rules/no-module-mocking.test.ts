import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { rule } from '../../src/rules/no-module-mocking.js';

const ruleTester = new RuleTester();
const error = {
  messageId: 'moduleMock' as const,
  type: AST_NODE_TYPES.CallExpression,
};

ruleTester.run('no-module-mocking', rule, {
  valid: [
    // A real fake, which is what the rule is steering toward.
    'const store = new InMemoryUserStore();',
    // Spying on an existing object leaves the module graph intact.
    "vi.spyOn(store, 'save');",
    // A local object named `vi` is not the framework global.
    'const vi = { mock() {} }; vi.mock();',
    // A parameter shadow likewise resolves to a definition.
    'function test(jest: { mock(): void }) { jest.mock(); }',
    // Imported from somewhere that is not the framework.
    "import { vi as localVi } from './helpers'; localVi.mock('./module');",
    // A framework method this rule does not own.
    "import { vi } from 'vitest'; vi.stubGlobal('fetch', fake);",
    // Dynamic key: no statically known method name.
    "vi[methodName]('./user-store');",
  ],
  invalid: [
    { code: "vi.mock('./user-store');", errors: [error] },
    { code: "jest.mock('./user-store');", errors: [error] },
    // String-literal computed access resolves to the same method name.
    { code: "vi['doMock']('./user-store');", errors: [error] },
    { code: "jest.unstable_mockModule('./user-store');", errors: [error] },
    // Explicitly imported rather than relying on globals.
    {
      code: "import { vi } from 'vitest'; vi.mock('./user-store');",
      errors: [error],
    },
    // A local alias still resolves to the framework object.
    {
      code: "import { vi as testApi } from 'vitest'; testApi.mock('./user-store');",
      errors: [error],
    },
    {
      code: "import { jest } from '@jest/globals'; jest.mock('./user-store');",
      errors: [error],
    },
  ],
});
