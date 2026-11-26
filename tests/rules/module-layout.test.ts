import { RuleTester } from '@typescript-eslint/rule-tester';
import plugin from '../../src/index.js';
import { rule } from '../../src/rules/module-layout.js';
import { TempTree } from '../support/temp-tree.js';

const ruleTester = new RuleTester();
const code = 'export {};';
const tree = new TempTree({
  files: [
    'src/index.ts',
    'src/audit/module.ts',
    'src/audit/scheduling/module.ts',
    'src/legacy/legacy-module.ts',
    'src/plain/loose.ts',
    'src/features/billing/index.ts',
  ],
});
const options = [
  {
    root: 'src',
    topLevel: { dirs: ['audit', 'features', 'config'], files: ['index.ts'] },
    module: { marker: 'module.ts' },
    moduleRoot: {
      files: ['errors.ts'],
      dirs: ['contracts', '__tests__'],
    },
    roles: ['models', 'services'],
    conceptFolders: true,
    maxConceptDepth: 1,
  },
] as const;
const line1 = { line: 1, column: 1 };

ruleTester.run('module-layout', rule, {
  valid: [
    // With no options, nothing is enforced.
    { code, filename: tree.at('src/anywhere/deep/file.ts') },
    { code, filename: tree.at('src/index.ts'), options },
    { code, filename: tree.at('src/config/env.ts'), options },
    // Files outside root are not checked.
    { code, filename: tree.at('scripts/build.ts'), options },
    { code, filename: tree.at('src/audit/module.ts'), options },
    { code, filename: tree.at('src/audit/errors.ts'), options },
    { code, filename: tree.at('src/audit/contracts/audit-contract.ts'), options },
    { code, filename: tree.at('src/audit/__tests__/audit.integration.test.ts'), options },
    { code, filename: tree.at('src/audit/services/schedule/schedule-builder.ts'), options },
    {
      code,
      filename: tree.at('src/audit/services/schedule/__tests__/schedule-builder.test.ts'),
      options,
    },
    // A submodule follows the same layout from its own root.
    { code, filename: tree.at('src/audit/scheduling/module.ts'), options },
    { code, filename: tree.at('src/audit/scheduling/models/slot/slot.ts'), options },
    // The marker file name is always allowed at a module root.
    {
      code,
      filename: tree.at('src/audit/module.ts'),
      options: [{ module: { marker: 'module.ts' }, moduleRoot: { files: [] } }],
    },
    // A custom marker glob, with `<module>` standing for the module folder's name.
    {
      code,
      filename: tree.at('src/legacy/legacy-errors.ts'),
      options: [{ module: { marker: '*-module.ts' }, moduleRoot: { files: ['<module>-errors.ts'] } }],
    },
    // The slice preset: no concept folders.
    { code, filename: tree.at('src/billing/index.ts'), options: [plugin.layouts.slice] },
    { code, filename: tree.at('src/billing/models/invoice.ts'), options: [plugin.layouts.slice] },
    {
      code,
      filename: tree.at('src/features/billing/services/invoice-service.ts'),
      options: [{ ...plugin.layouts.slice, module: { match: 'src/features/*' } }],
    },
    // The module preset is a usable option object.
    {
      code,
      filename: tree.at('src/audit/repositories/audit/sql-audit-repository.ts'),
      options: [plugin.layouts.module],
    },
  ],
  invalid: [
    {
      code,
      filename: tree.at('src/main.ts'),
      options,
      errors: [{ messageId: 'topLevelFile', ...line1, data: { entry: 'main.ts', root: 'src', allowed: 'index.ts' } }],
    },
    {
      code,
      filename: tree.at('src/plain/loose.ts'),
      options,
      errors: [{ messageId: 'topLevelDir', ...line1 }],
    },
    {
      code,
      filename: tree.at('src/audit/schedule-builder.ts'),
      options,
      errors: [
        {
          messageId: 'moduleRootFile',
          ...line1,
          data: {
            file: 'schedule-builder.ts',
            module: 'audit',
            allowed: 'errors.ts, module.ts',
            expected: '<role>/<concept>/schedule-builder.ts',
          },
        },
      ],
    },
    {
      code,
      filename: tree.at('src/audit/helpers/format.ts'),
      options,
      errors: [{ messageId: 'moduleRootDir', ...line1 }],
    },
    {
      code,
      filename: tree.at('src/audit/services/schedule-builder.ts'),
      options,
      errors: [
        {
          messageId: 'flatFile',
          ...line1,
          data: {
            file: 'schedule-builder.ts',
            role: 'services',
            expected: 'services/<concept>/schedule-builder.ts',
          },
        },
      ],
    },
    {
      code,
      filename: tree.at('src/audit/services/__tests__/schedule-builder.test.ts'),
      options,
      errors: [
        {
          messageId: 'flatFile',
          data: {
            file: 'schedule-builder.test.ts',
            role: 'services',
            expected: 'services/<concept>/__tests__/schedule-builder.test.ts',
          },
        },
      ],
    },
    {
      code,
      filename: tree.at('src/audit/services/schedule/parts/slot-builder.ts'),
      options,
      errors: [
        {
          messageId: 'nestedFile',
          data: {
            file: 'slot-builder.ts',
            role: 'services',
            expected: 'services/schedule/slot-builder.ts',
          },
        },
      ],
    },
    {
      code,
      filename: tree.at('src/features/billing/services/invoice/invoice-service.ts'),
      options: [{ ...plugin.layouts.slice, module: { match: 'src/features/*' } }],
      errors: [
        { messageId: 'nestedFile', data: { file: 'invoice-service.ts', role: 'services', expected: 'services/invoice-service.ts' } },
      ],
    },
  ],
});
