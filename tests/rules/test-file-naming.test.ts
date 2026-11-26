import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/test-file-naming.js';
import { TempTree } from '../support/temp-tree.js';

const ruleTester = new RuleTester();
const code = 'export {};';
const tree = new TempTree({
  files: [
    'src/audit/module.ts',
    'src/audit/services/schedule/schedule-builder.ts',
    'src/audit/services/schedule/slot-picker.tsx',
  ],
});
const withModules = [{ module: { marker: 'module.ts' } }] as const;
const line1 = { line: 1, column: 1 };

ruleTester.run('test-file-naming', rule, {
  valid: [
    { code, filename: tree.at('src/audit/services/schedule/schedule-builder.ts') },
    { code, filename: tree.at('src/audit/services/schedule/__tests__/schedule-builder.test.ts') },
    { code, filename: tree.at('src/audit/services/schedule/__tests__/schedule-builder.integration.test.ts') },
    { code, filename: tree.at('src/audit/services/schedule/__tests__/slot-picker.test.tsx') },
    // A module-level __tests__/ holds cross-concept tests under any name.
    { code, filename: tree.at('src/audit/__tests__/end-to-end-flow.e2e.test.ts'), options: withModules },
    // Files beside the test that are not tests are left alone.
    { code, filename: tree.at('src/audit/services/schedule/__tests__/support/builder.ts') },
    // Adjacent tests are not matched against a source.
    { code, filename: tree.at('src/audit/services/schedule/anything.test.ts') },
    {
      code,
      filename: tree.at('src/audit/services/schedule/__tests__/whatever.test.ts'),
      options: [{ matchSource: 'off' }],
    },
  ],
  invalid: [
    {
      code,
      filename: tree.at('src/audit/services/schedule/__tests__/schedule-builder.spec.ts'),
      errors: [
        {
          messageId: 'unknownSuffix',
          ...line1,
          data: {
            file: 'schedule-builder.spec.ts',
            allowed: '.test, .integration.test, .e2e.test',
          },
        },
      ],
    },
    {
      code,
      filename: tree.at('src/audit/services/schedule/__tests__/scheduler.test.ts'),
      errors: [
        {
          messageId: 'noMatchingSource',
          ...line1,
          data: { file: 'scheduler.test.ts', subject: 'scheduler', folder: 'schedule' },
        },
      ],
    },
    {
      // Without module recognition, a module-level __tests__/ is treated like any other.
      code,
      filename: tree.at('src/audit/__tests__/end-to-end-flow.e2e.test.ts'),
      errors: [{ messageId: 'noMatchingSource' }],
    },
  ],
});
