import path from 'node:path';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';
import { GlobMatcher } from '../glob-matcher.js';

type Options = [{ groupingFiles?: string[] }];

const typeScriptExtension = /\.[cm]?tsx?$/u;
const declarationFile = /\.d\.[cm]?tsx?$/u;
const testFile = /\.(?:test|spec)\.[cm]?tsx?$/u;

/**
 * A file named for the class it exports can be found from either end: the
 * class name says where it lives, and the file name says what it holds. The
 * class may add a qualifier in front (`PinoLoggerBinder` in `logger-binder.ts`).
 */
export const rule = createRule<Options, 'mismatch'>({
  name: 'filename-matches-export',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require every exported class name to end with the PascalCase file name',
    },
    messages: {
      mismatch:
        "Exported class '{{name}}' does not end with '{{expected}}'. Rename the class or the file so they match.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          groupingFiles: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            description:
              'Globs for files that deliberately export a family of classes. A glob without `/` matches the basename; one with `/` matches the path relative to the working directory.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ groupingFiles: ['*-errors.ts', 'errors.ts', 'ids.ts'] }],
  create(context, [{ groupingFiles = [] }]) {
    const basename = path.basename(context.filename);
    const relative = path
      .relative(context.cwd, context.filename)
      .split(path.sep)
      .join('/');
    const stem = basename.replace(typeScriptExtension, '');
    const isTest =
      testFile.test(basename) || relative.split('/').includes('__tests__');
    const basenameGlobs = groupingFiles.filter((glob) => !glob.includes('/'));
    const pathGlobs = groupingFiles.filter((glob) => glob.includes('/'));
    if (
      isTest ||
      stem === 'index' ||
      declarationFile.test(basename) ||
      new GlobMatcher(basenameGlobs).matches(basename) ||
      new GlobMatcher(pathGlobs).matches(relative)
    ) {
      return {};
    }
    const expected = stem
      .split(/[-._]/u)
      .filter((word) => word.length > 0)
      .map((word) => word[0]!.toUpperCase() + word.slice(1))
      .join('');
    const localClasses = new Map<string, TSESTree.Identifier>();

    const check = (id: TSESTree.Identifier, name: string): void => {
      if (name.endsWith(expected)) return;
      context.report({
        node: id,
        messageId: 'mismatch',
        data: { name, expected },
      });
    };

    return {
      'Program > ClassDeclaration'(node: TSESTree.ClassDeclaration): void {
        if (node.id !== null) localClasses.set(node.id.name, node.id);
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration): void {
        if (
          node.declaration?.type === AST_NODE_TYPES.ClassDeclaration &&
          node.declaration.id !== null
        ) {
          check(node.declaration.id, node.declaration.id.name);
        }
      },
      ExportDefaultDeclaration(node: TSESTree.ExportDefaultDeclaration): void {
        if (
          node.declaration.type === AST_NODE_TYPES.ClassDeclaration &&
          node.declaration.id !== null
        ) {
          check(node.declaration.id, node.declaration.id.name);
        }
      },
      'Program:exit'(program: TSESTree.Program): void {
        for (const statement of program.body) {
          if (
            statement.type !== AST_NODE_TYPES.ExportNamedDeclaration ||
            statement.source !== null ||
            statement.exportKind === 'type'
          ) {
            continue;
          }
          for (const specifier of statement.specifiers) {
            if (specifier.local.type !== AST_NODE_TYPES.Identifier) continue;
            const id = localClasses.get(specifier.local.name);
            if (id === undefined) continue;
            const exported =
              specifier.exported.type === AST_NODE_TYPES.Identifier
                ? specifier.exported.name
                : specifier.exported.value;
            if (exported !== 'default') check(id, exported);
          }
        }
      },
    };
  },
});
