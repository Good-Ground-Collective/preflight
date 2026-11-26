import { directories } from '../layout/directory-reader.js';
import { lintedFiles } from '../layout/linted-file.js';
import { sourceFileKinds } from '../layout/source-file-kinds.js';
import { createRule } from '../utils.js';

type Options = [{ max?: number }];

/**
 * Reads the filesystem to count the source files beside the linted file.
 * Only the alphabetically first source file reports, so a crowded folder
 * yields one error rather than one per file.
 */
export const rule = createRule<Options, 'tooManyEntries'>({
  name: 'max-directory-entries',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Limit how many source files one folder may hold, so large folders get split into subfolders',
    },
    messages: {
      tooManyEntries:
        '{{folder}}/ holds {{count}} source files, more than {{max}}. Split it into subfolders, one per concept.',
    },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ max: 12 }],
  create(context, [{ max = 12 }]) {
    const file = lintedFiles.resolve(context);
    if (file === null || !sourceFileKinds.isProductionSource(file.name)) return {};
    return {
      Program(): void {
        const sources = directories
          .fileNames(file.directory)
          .filter((name) => sourceFileKinds.isProductionSource(name))
          .sort();
        if (sources.length <= max || sources[0] !== file.name) return;
        context.report({
          loc: { line: 1, column: 0 },
          messageId: 'tooManyEntries',
          data: {
            folder: file.segmentsBelow(file.packageRoot)?.slice(0, -1).join('/') || '.',
            count: String(sources.length),
            max: String(max),
          },
        });
      },
    };
  },
});
