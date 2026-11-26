import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/test-location.js';
import { TempTree } from '../support/temp-tree.js';

const ruleTester = new RuleTester();
const code = 'export {};';
const tree = new TempTree({
  files: [
    'src/audit/module.ts',
    'src/audit/services/schedule/schedule-builder.ts',
    'src/empty/__tests__/orphan.test.ts',
  ],
});
const adjacent = [{ style: 'adjacent' }] as const;
const line1 = { line: 1, column: 1 };

ruleTester.run('test-location', rule, {
  valid: [
    { code, filename: tree.at('src/audit/services/schedule/schedule-builder.ts') },
    { code, filename: tree.at('src/audit/services/schedule/__tests__/schedule-builder.test.ts') },
    { code, filename: tree.at('src/audit/__tests__/audit.integration.test.ts') },
    // Helpers and fixtures live in the allowed subfolders.
    { code, filename: tree.at('src/audit/__tests__/support/audit-builder.ts') },
    { code, filename: tree.at('src/audit/__tests__/fixtures/audit.test.ts') },
    // Non-source files are not checked.
    { code, filename: tree.at('tests/notes.md') },
    { code, filename: tree.at('src/audit/services/schedule/schedule-builder.test.ts'), options: adjacent },
    { code, filename: tree.at('tests/e2e/login.test.ts'), options: [{ style: 'adjacent', forbiddenRoots: [] }] },
  ],
  invalid: [
    {
      code,
      filename: tree.at('tests/audit.test.ts'),
      errors: [{ messageId: 'forbiddenRoot', ...line1, data: { file: 'audit.test.ts', root: 'tests' } }],
    },
    {
      code,
      filename: tree.at('src/__tests__/audit.test.ts'),
      errors: [{ messageId: 'forbiddenRoot', data: { file: 'audit.test.ts', root: 'src/__tests__' } }],
    },
    {
      code,
      filename: tree.at('test/audit.test.ts'),
      options: adjacent,
      errors: [{ messageId: 'forbiddenRoot' }],
    },
    {
      code,
      filename: tree.at('src/audit/services/schedule/schedule-builder.test.ts'),
      errors: [
        {
          messageId: 'notInTestsFolder',
          ...line1,
          data: {
            file: 'schedule-builder.test.ts',
            expected: 'src/audit/services/schedule/__tests__/schedule-builder.test.ts',
          },
        },
      ],
    },
    {
      code,
      filename: tree.at('src/audit/services/schedule/__tests__/unit/schedule-builder.test.ts'),
      errors: [
        {
          messageId: 'nestedTestsFolder',
          data: {
            file: 'schedule-builder.test.ts',
            folder: 'unit',
            expected: 'src/audit/services/schedule/__tests__/schedule-builder.test.ts',
            allowed: '__tests__/support/, __tests__/fixtures/',
          },
        },
      ],
    },
    {
      code,
      filename: tree.at('src/audit/services/schedule/__tests__/helpers.ts'),
      errors: [{ messageId: 'sourceInTestsFolder' }],
    },
    {
      code,
      filename: tree.at('src/empty/__tests__/orphan.test.ts'),
      errors: [{ messageId: 'orphanTestsFolder', data: { file: 'orphan.test.ts' } }],
    },
    {
      code,
      filename: tree.at('src/audit/services/schedule/__tests__/schedule-builder.test.ts'),
      options: adjacent,
      errors: [
        {
          messageId: 'notAdjacent',
          data: {
            file: 'schedule-builder.test.ts',
            expected: 'src/audit/services/schedule/schedule-builder.test.ts',
          },
        },
      ],
    },
  ],
});
