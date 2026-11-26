import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import { CommentPrefix } from '../comment-prefix.js';
import { createRule } from '../utils.js';

type Options = [{ allowPrefixes?: string[]; additionalPrefixes?: string[] }];

const defaultAllowPrefixes = [
  'eslint-disable',
  'eslint-enable',
  '@ts-expect-error',
  '@ts-ignore',
  'prettier-ignore',
  'c8 ignore',
  'v8 ignore',
  'istanbul ignore',
  'SAFETY:',
];

const eslintInlineConfig =
  /^(?:eslint(?:-disable(?:-next-line|-line)?|-enable|-env)?|globals?|exported)(?:\s|$)/u;

const tripleSlashDirective = /^\/\s*<[\w-]+\b[^>]*\/>\s*$/u;

const declarationTypes: ReadonlySet<AST_NODE_TYPES> = new Set([
  AST_NODE_TYPES.ClassDeclaration,
  AST_NODE_TYPES.TSInterfaceDeclaration,
  AST_NODE_TYPES.TSTypeAliasDeclaration,
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.TSDeclareFunction,
  AST_NODE_TYPES.TSEnumDeclaration,
  AST_NODE_TYPES.TSEnumMember,
  AST_NODE_TYPES.VariableDeclaration,
  AST_NODE_TYPES.MethodDefinition,
  AST_NODE_TYPES.TSAbstractMethodDefinition,
  AST_NODE_TYPES.PropertyDefinition,
  AST_NODE_TYPES.TSAbstractPropertyDefinition,
  AST_NODE_TYPES.AccessorProperty,
  AST_NODE_TYPES.TSAbstractAccessorProperty,
  AST_NODE_TYPES.TSParameterProperty,
  AST_NODE_TYPES.TSPropertySignature,
  AST_NODE_TYPES.TSMethodSignature,
  AST_NODE_TYPES.TSIndexSignature,
  AST_NODE_TYPES.TSCallSignatureDeclaration,
  AST_NODE_TYPES.TSConstructSignatureDeclaration,
  AST_NODE_TYPES.Property,
]);

/**
 * Comments are reported unless they are a doc comment on a declaration, a tool
 * directive, or an annotation another rule demands. A prefix ending in `:`
 * tolerates whitespace before the colon, matching how
 * `require-safety-comment-for-type-assertion` reads its `SAFETY:` note.
 */
export const rule = createRule<Options, 'comment' | 'floatingDocComment'>({
  name: 'no-comments',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow comments other than doc comments on declarations and tool directives',
    },
    messages: {
      comment:
        'Comments are not allowed. Say it with names and types, move it into a doc comment on the declaration it describes, or delete it.',
      floatingDocComment:
        'Doc comment is not attached to a declaration. Move it onto the declaration it documents, or delete it.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowPrefixes: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Comment prefixes that mark a directive. Replaces the default list.',
          },
          additionalPrefixes: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Prefixes added to `allowPrefixes`, for annotations other rules require.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    { allowPrefixes: defaultAllowPrefixes, additionalPrefixes: [] },
  ],
  create(
    context,
    [{ allowPrefixes = defaultAllowPrefixes, additionalPrefixes = [] }],
  ) {
    const { sourceCode } = context;
    const prefixes = [...allowPrefixes, ...additionalPrefixes].map(
      (prefix) => new CommentPrefix({ prefix }),
    );

    const isShebang = (comment: TSESTree.Comment): boolean =>
      comment.range[0] === 0 && sourceCode.text.startsWith('#!');

    const isDirective = (comment: TSESTree.Comment): boolean => {
      if (
        comment.type === AST_TOKEN_TYPES.Line &&
        tripleSlashDirective.test(comment.value)
      ) {
        return true;
      }
      return (
        eslintInlineConfig.test(comment.value.trim()) ||
        prefixes.some((prefix) => prefix.matches(comment))
      );
    };

    const isDocComment = (comment: TSESTree.Comment): boolean =>
      comment.type === AST_TOKEN_TYPES.Block && comment.value.startsWith('*');

    const isDeclaration = (node: TSESTree.Node): boolean => {
      if (
        node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
        node.type === AST_NODE_TYPES.ExportDefaultDeclaration
      ) {
        return node.declaration !== null && isDeclaration(node.declaration);
      }
      return declarationTypes.has(node.type);
    };

    const documentsDeclaration = (comment: TSESTree.Comment): boolean => {
      const next = sourceCode.getTokenAfter(comment, {
        includeComments: false,
      });
      if (next === null) return false;
      let node: TSESTree.Node | null = sourceCode.getNodeByRangeIndex(
        next.range[0],
      );
      while (node !== null && node.range[0] === next.range[0]) {
        if (isDeclaration(node)) return true;
        node = node.parent ?? null;
      }
      return false;
    };

    return {
      Program(): void {
        for (const comment of sourceCode.getAllComments()) {
          if (isShebang(comment) || isDirective(comment)) continue;
          if (!isDocComment(comment)) {
            context.report({ loc: comment.loc, messageId: 'comment' });
          } else if (!documentsDeclaration(comment)) {
            context.report({ loc: comment.loc, messageId: 'floatingDocComment' });
          }
        }
      },
    };
  },
});
