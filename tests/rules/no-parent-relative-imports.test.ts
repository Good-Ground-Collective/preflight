import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-parent-relative-imports.js';

const ruleTester = new RuleTester();
const error = { messageId: 'parentImport' as const };

ruleTester.run('no-parent-relative-imports', rule, {
  valid: [
    "import { a } from './local.js';",
    "import { a } from '#models/user.js';",
    "import { a } from 'package/../thing';",
    "import { a } from './..foo.js';",
    {
      code: "import { a } from '../index.js';",
      options: [{ allow: ['^\\.\\./index\\.js$'] }],
    },
  ],
  invalid: [
    { code: "import { a } from '../sibling.js';", errors: [error] },
    { code: "import { a } from '../../deep/a.js';", errors: [error] },
    { code: "import '..';", errors: [error] },
    { code: "import { a } from './nested/../a.js';", errors: [error] },
    { code: "export { a } from '../a.js';", errors: [error] },
    { code: "export * from '../a.js';", errors: [error] },
    { code: "const m = await import('../a.js');", errors: [error] },
    { code: "const m = require('../a.js');", errors: [error] },
    {
      code: "import { a } from '../sibling.js';",
      options: [{ allow: ['^\\.\\./index\\.js$'] }],
      errors: [error],
    },
  ],
});
