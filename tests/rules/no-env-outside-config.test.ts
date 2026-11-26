import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-env-outside-config.js';

const ruleTester = new RuleTester();
const error = (source: string) => ({
  messageId: 'envAccess' as const,
  data: { source },
});

ruleTester.run('no-env-outside-config', rule, {
  valid: [
    { code: 'const port = process.env.PORT;', filename: 'src/config/env.ts' },
    { code: 'const port = process.env.PORT;', filename: 'config/index.ts' },
    { code: 'const port = process.env.PORT;', filename: 'vite.config.ts' },
    {
      code: 'const port = process.env.PORT;',
      filename: 'apps/web/vitest.config.ts',
    },
    {
      code: 'const mode = import.meta.env.MODE;',
      filename: 'src/config/client.ts',
    },
    { code: 'const port = settings.env.PORT;', filename: 'src/server.ts' },
    { code: 'const meta = import.meta.url;', filename: 'src/server.ts' },
    {
      code: 'const port = process.env.PORT;',
      filename: 'scripts/release.ts',
      options: [{ allow: ['scripts/**'] }],
    },
  ],
  invalid: [
    {
      code: 'const port = process.env.PORT;',
      filename: 'src/server.ts',
      errors: [error('process.env')],
    },
    {
      code: "const port = process['env'].PORT;",
      filename: 'src/server.ts',
      errors: [error('process.env')],
    },
    {
      code: "import process from 'node:process';\nconst port = process.env.PORT;",
      filename: 'src/server.ts',
      errors: [error('process.env')],
    },
    {
      code: 'const mode = import.meta.env.MODE;',
      filename: 'src/app.ts',
      errors: [error('import.meta.env')],
    },
    {
      code: 'const port = process.env.PORT;',
      filename: 'src/config/env.ts',
      options: [{ allow: ['scripts/**'] }],
      errors: [error('process.env')],
    },
  ],
});
