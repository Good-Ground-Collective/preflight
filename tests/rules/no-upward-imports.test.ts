import { fileURLToPath } from 'node:url';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-upward-imports.js';

const ruleTester = new RuleTester();
const packageRoot = fileURLToPath(
  new URL('../fixtures/package-root/pkg/', import.meta.url),
);
const nested = `${packageRoot}src/nested/file.ts`;
const atRoot = `${packageRoot}file.ts`;
const outsideAnyPackage = '/no-package-here/src/file.ts';
const error = { messageId: 'upwardImport' as const };

ruleTester.run('no-upward-imports', rule, {
  valid: [
    { code: "import { a } from '../sibling.js';", filename: nested },
    { code: "import { a } from '../../index.js';", filename: nested },
    { code: "import { a } from './local.js';", filename: atRoot },
    { code: "import { a } from 'other-package';", filename: nested },
    { code: "import { a } from '#alias/thing.js';", filename: nested },
    { code: 'const m = await import(name);', filename: atRoot },
    {
      code: "import { a } from '../../../../escape.js';",
      filename: outsideAnyPackage,
    },
  ],
  invalid: [
    {
      code: "import { a } from '../../../other/src/a.js';",
      filename: nested,
      errors: [error],
    },
    {
      code: "import { a } from '../outside.js';",
      filename: atRoot,
      errors: [error],
    },
    { code: "import '..';", filename: atRoot, errors: [error] },
    {
      code: "export { a } from '../outside.js';",
      filename: atRoot,
      errors: [error],
    },
    {
      code: "export * from '../outside.js';",
      filename: atRoot,
      errors: [error],
    },
    {
      code: "const m = await import('../outside.js');",
      filename: atRoot,
      errors: [error],
    },
    {
      code: 'const m = await import(`../outside.js`);',
      filename: atRoot,
      errors: [error],
    },
    {
      code: "const m = require('../outside.js');",
      filename: atRoot,
      errors: [error],
    },
    {
      code: "import m = require('../outside.js');",
      filename: atRoot,
      errors: [error],
    },
  ],
});
