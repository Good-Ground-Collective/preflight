import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-service-constructor-imports.js';

const ruleTester = new RuleTester();

ruleTester.run('no-service-constructor-imports', rule, {
  valid: [
    {
      // Test files may construct services directly.
      filename: 'src/issue-service.test.ts',
      code: 'import { makeIssueService } from "./issue-service.ts";',
    },
    {
      // `.spec.tsx` counts as a test file too.
      filename: 'src/issue-service.spec.tsx',
      code: 'import { makeIssueService } from "../issue-service.ts";',
    },
    {
      // Package imports are out of scope; only project-local ones are checked.
      filename: 'src/runtime.ts',
      code: 'import { makeExecutionMemo } from "alchemy/Runtime/ExecutionMemo";',
    },
    {
      // Importing the Layer is the prescribed alternative.
      filename: 'src/runtime.ts',
      code: 'import { issueServiceLayer } from "./issue-service.ts";',
    },
    {
      // `make` must be followed by a capital to name a capability.
      filename: 'src/runtime.ts',
      code: 'import { makeissueService } from "./issue-service.ts";',
    },
    {
      // A default import carries no imported name to match.
      filename: 'src/runtime.ts',
      code: 'import makeIssueService from "./issue-service.ts";',
    },
  ],
  invalid: [
    {
      filename: 'src/runtime.ts',
      code: 'import { makeIssueService } from "./issue-service.ts";',
      errors: [
        {
          messageId: 'serviceConstructorImport',
          data: { name: 'makeIssueService' },
        },
      ],
    },
    {
      // The imported name is reported, not the local alias.
      filename: 'src/runtime.ts',
      code: 'import { makeIssueService as createIssueService } from "../issue-service.ts";',
      errors: [
        {
          messageId: 'serviceConstructorImport',
          data: { name: 'makeIssueService' },
        },
      ],
    },
    {
      // Each offending specifier reports independently.
      filename: 'src/runtime.ts',
      code: 'import { makeIssueService, makeUserService } from "./services.ts";',
      errors: [
        {
          messageId: 'serviceConstructorImport',
          data: { name: 'makeIssueService' },
        },
        {
          messageId: 'serviceConstructorImport',
          data: { name: 'makeUserService' },
        },
      ],
    },
  ],
});
