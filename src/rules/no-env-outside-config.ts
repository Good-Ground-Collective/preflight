import path from 'node:path';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';
import { analysis } from '../analysis.js';
import { GlobMatcher } from '../glob-matcher.js';

type Options = [{ allow?: string[] }];

/**
 * Environment variables read across the codebase are untyped strings that each
 * reader validates, or forgets to. Reading them in one config module, parsed
 * once, gives the rest of the code typed settings.
 */
export const rule = createRule<Options, 'envAccess'>({
  name: 'no-env-outside-config',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow `process.env` and `import.meta.env` outside configuration files',
    },
    messages: {
      envAccess:
        'Read `{{source}}` only in a config module, parse it once there, and pass the typed settings in.',
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
              'Globs, relative to the working directory, of files allowed to read the environment.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allow: ['**/config/**', '**/*.config.ts'] }],
  create(context, [{ allow = [] }]) {
    const relative = path
      .relative(context.cwd, context.filename)
      .split(path.sep)
      .join('/');
    if (new GlobMatcher(allow).matches(relative)) return {};

    const isImportMeta = (node: TSESTree.Node): boolean =>
      node.type === AST_NODE_TYPES.MetaProperty &&
      node.meta.name === 'import' &&
      node.property.name === 'meta';

    return {
      MemberExpression(node: TSESTree.MemberExpression): void {
        if (analysis.staticMemberName(node) !== 'env') return;
        const { object } = node;
        if (isImportMeta(object)) {
          context.report({
            node,
            messageId: 'envAccess',
            data: { source: 'import.meta.env' },
          });
          return;
        }
        if (
          object.type === AST_NODE_TYPES.Identifier &&
          object.name === 'process'
        ) {
          context.report({
            node,
            messageId: 'envAccess',
            data: { source: 'process.env' },
          });
        }
      },
    };
  },
});
