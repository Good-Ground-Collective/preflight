import { lintedFiles } from '../layout/linted-file-resolver.js';
import type { ModuleLayoutMessageId } from '../layout/module-layout-checker.js';
import { ModuleLayoutChecker } from '../layout/module-layout-checker.js';
import type { ModuleLayoutOptions } from '../layout/module-layout-options.js';
import { optionSchemas } from '../layout/option-schemas.js';
import { createRule } from '../utils.js';

type Options = [ModuleLayoutOptions];

/**
 * Reads the filesystem: a module is recognized by a marker file or a path
 * glob, and each file is checked against the folders its module allows.
 */
export const rule = createRule<Options, ModuleLayoutMessageId>({
  name: 'module-layout',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require files to follow the configured module → role → concept folder layout',
    },
    messages: {
      topLevelFile:
        '{{entry}} may not sit directly in {{root}}/. Allowed files there: {{allowed}}.',
      topLevelDir:
        "'{{entry}}/' is not an allowed top-level folder of {{root}}/. Allowed folders: {{allowed}}.",
      moduleRootFile:
        "{{file}} does not belong at the root of module '{{module}}/'. Allowed there: {{allowed}}. Expected {{expected}}.",
      moduleRootDir:
        "'{{folder}}/' is not a role or module folder of '{{module}}/'. Allowed: {{allowed}}, or a submodule. Expected {{expected}}.",
      flatFile:
        '{{file}} sits directly in {{role}}/. Put it in a concept folder: expected {{expected}}.',
      nestedFile:
        '{{file}} is nested too deep under {{role}}/. Expected {{expected}}.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          root: { type: 'string' },
          topLevel: {
            type: 'object',
            properties: { dirs: optionSchemas.names, files: optionSchemas.names },
            additionalProperties: false,
          },
          module: optionSchemas.module,
          moduleRoot: {
            type: 'object',
            properties: { dirs: optionSchemas.names, files: optionSchemas.names },
            additionalProperties: false,
          },
          roles: optionSchemas.names,
          conceptFolders: { type: 'boolean' },
          maxConceptDepth: { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const file = lintedFiles.resolve(context);
    if (file === null) return {};
    return {
      Program(): void {
        const violation = new ModuleLayoutChecker({ options, file }).check();
        if (violation === null) return;
        context.report({ loc: { line: 1, column: 0 }, ...violation });
      },
    };
  },
});
