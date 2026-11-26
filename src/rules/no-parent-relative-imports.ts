import { createRule } from '../utils.js';
import { importSources } from '../import-sources.js';

type Options = [{ allow?: string[] }];

const parentSegment = /(?:^|\/)\.\.(?:\/|$)/u;

/**
 * A `../` path encodes where the importer sits, so every move breaks it and a
 * reader has to count levels to know what it names. A `#alias/` subpath from
 * the package's `imports` map names the target the same way from anywhere.
 */
export const rule = createRule<Options, 'parentImport'>({
  name: 'no-parent-relative-imports',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow `../` import specifiers; import across folders through a `#alias/` subpath',
    },
    messages: {
      parentImport:
        "Import '{{specifier}}' climbs with `../`. Add a `#alias/` subpath to the package.json `imports` map and import through it.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            description:
              'Regular expressions; a specifier matching any of them is exempt.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allow: [] }],
  create(context, [{ allow = [] }]) {
    const exemptions = allow.map((pattern) => new RegExp(pattern, 'u'));
    return importSources.listen((node, specifier) => {
      if (!specifier.startsWith('.') || !parentSegment.test(specifier)) return;
      if (exemptions.some((pattern) => pattern.test(specifier))) return;
      context.report({ node, messageId: 'parentImport', data: { specifier } });
    });
  },
});
