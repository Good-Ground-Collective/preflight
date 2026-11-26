import { lintedFiles } from '../layout/linted-file-resolver.js';
import { optionSchemas } from '../layout/option-schemas.js';
import type { TestNameMessageId, TestNameOptions } from '../layout/test-name-checker.js';
import { TestNameChecker } from '../layout/test-name-checker.js';
import { createRule } from '../utils.js';

type Options = [Partial<TestNameOptions>];

/** Reads the filesystem to check that a concept's test is named for a source file beside it. */
export const rule = createRule<Options, TestNameMessageId>({
  name: 'test-file-naming',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require test files to use an allowed suffix and to be named for the source file they cover',
    },
    messages: {
      unknownSuffix:
        '{{file}} does not use an allowed test suffix. Use one of {{allowed}}.',
      noMatchingSource:
        "{{file}} is named for '{{subject}}', but {{folder}}/ has no {{subject}} source file. Name the test for the file it covers, or move it to the module's __tests__/.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          suffixes: optionSchemas.names,
          matchSource: { type: 'string', enum: ['concept', 'off'] },
          module: optionSchemas.module,
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    { suffixes: ['test', 'integration.test', 'e2e.test'], matchSource: 'concept' },
  ],
  create(context, [options]) {
    const file = lintedFiles.resolve(context);
    if (file === null) return {};
    const resolved: TestNameOptions = {
      suffixes: options.suffixes ?? [],
      matchSource: options.matchSource ?? 'concept',
      module: options.module,
    };
    return {
      Program(): void {
        const violation = new TestNameChecker({ options: resolved, file }).check();
        if (violation === null) return;
        context.report({ loc: { line: 1, column: 0 }, ...violation });
      },
    };
  },
});
