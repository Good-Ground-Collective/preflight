import { lintedFiles } from '../layout/linted-file-resolver.js';
import { optionSchemas } from '../layout/option-schemas.js';
import type {
  TestPlacementMessageId,
  TestPlacementOptions,
} from '../layout/test-placement-checker.js';
import { TestPlacementChecker } from '../layout/test-placement-checker.js';
import { createRule } from '../utils.js';

type Options = [Partial<TestPlacementOptions>];

/** Reads the filesystem to keep tests in a `__tests__/` folder beside the code they cover. */
export const rule = createRule<Options, TestPlacementMessageId>({
  name: 'test-location',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require tests to sit in a `__tests__/` folder beside their code (or beside the source file), never in a repo-level test tree',
    },
    messages: {
      forbiddenRoot:
        '{{file}} sits under {{root}}/, which may not hold tests. Move it into a __tests__/ folder beside the code it covers.',
      notInTestsFolder:
        '{{file}} is not in a __tests__/ folder. Expected {{expected}}.',
      nestedTestsFolder:
        '{{file}} sits in __tests__/{{folder}}/, which is not an allowed subfolder ({{allowed}}). Expected {{expected}}.',
      orphanTestsFolder:
        "{{file}} sits in a __tests__/ folder whose parent holds no source code. Move the tests beside the code they cover.",
      notAdjacent:
        '{{file}} sits in a __tests__/ folder, but tests sit beside their source here. Expected {{expected}}.',
      sourceInTestsFolder:
        '{{file}} is not a test, so it does not belong in __tests__/. Move it beside the code, or into {{allowed}}.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          style: { type: 'string', enum: ['tests-folder', 'adjacent'] },
          forbiddenRoots: optionSchemas.names,
          allowedSubfolders: optionSchemas.names,
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      style: 'tests-folder',
      forbiddenRoots: ['test', 'tests', 'src/__tests__'],
      allowedSubfolders: ['support', 'fixtures'],
    },
  ],
  create(context, [options]) {
    const file = lintedFiles.resolve(context);
    if (file === null) return {};
    const resolved: TestPlacementOptions = {
      style: options.style ?? 'tests-folder',
      forbiddenRoots: options.forbiddenRoots ?? [],
      allowedSubfolders: options.allowedSubfolders ?? [],
    };
    return {
      Program(): void {
        const violation = new TestPlacementChecker({ options: resolved, file }).check();
        if (violation === null) return;
        context.report({ loc: { line: 1, column: 0 }, ...violation });
      },
    };
  },
});
