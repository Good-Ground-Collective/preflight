import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/max-directory-entries.js';
import { TempTree } from '../support/temp-tree.js';

const ruleTester = new RuleTester();
const code = 'export {};';
const crowded = ['alpha', 'bravo', 'charlie', 'delta'].map((name) => `src/crowded/${name}.ts`);
const tree = new TempTree({
  files: [
    ...crowded,
    'src/crowded/alpha.test.ts',
    'src/crowded/__tests__/bravo.test.ts',
    'src/crowded/readme.md',
    'src/roomy/alpha.ts',
    'src/roomy/bravo.ts',
    'src/roomy/__tests__/alpha.test.ts',
    'src/roomy/__tests__/bravo.test.ts',
    'src/roomy/__tests__/charlie.test.ts',
  ],
});
const max3 = [{ max: 3 }] as const;

ruleTester.run('max-directory-entries', rule, {
  valid: [
    // Only the alphabetically first source file reports.
    { code, filename: tree.at('src/crowded/bravo.ts'), options: max3 },
    { code, filename: tree.at('src/crowded/delta.ts'), options: max3 },
    // Tests never report.
    { code, filename: tree.at('src/crowded/alpha.test.ts'), options: max3 },
    // At the default limit of 12, four files are fine.
    { code, filename: tree.at('src/crowded/alpha.ts') },
    // Tests and __tests__/ do not count toward the limit.
    { code, filename: tree.at('src/roomy/alpha.ts'), options: [{ max: 2 }] },
  ],
  invalid: [
    {
      code,
      filename: tree.at('src/crowded/alpha.ts'),
      options: max3,
      errors: [
        {
          messageId: 'tooManyEntries',
          line: 1,
          column: 1,
          data: { folder: 'src/crowded', count: '4', max: '3' },
        },
      ],
    },
  ],
});
