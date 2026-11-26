import path from 'node:path';
import { createRule } from '../utils.js';
import { importSources } from '../import-sources.js';
import { packageRootFinder } from '../package-root-finder.js';

/**
 * A relative import that leaves its package reaches into a sibling's source
 * instead of its published entry point, so the dependency never shows up in
 * `package.json` and breaks as soon as the packages are built or moved apart.
 */
export const rule = createRule({
  name: 'no-upward-imports',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow relative imports that resolve outside the package root',
    },
    messages: {
      upwardImport:
        "Import '{{specifier}}' resolves outside this package. Depend on the other package by name instead.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const directory = path.dirname(context.filename);
    const root = packageRootFinder.find(directory);
    if (root === null) return {};
    return importSources.listen((node, specifier) => {
      if (!specifier.startsWith('.')) return;
      const relative = path.relative(root, path.resolve(directory, specifier));
      if (
        relative !== '..' &&
        !relative.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relative)
      ) {
        return;
      }
      context.report({ node, messageId: 'upwardImport', data: { specifier } });
    });
  },
});
