import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

/**
 * Statement types a comment may legitimately sit on top of: the paragraph is
 * documentation for the declaration, so JSDoc conventions apply instead.
 */
const declarationTypes: ReadonlySet<AST_NODE_TYPES> = new Set([
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.ClassDeclaration,
  AST_NODE_TYPES.VariableDeclaration,
  AST_NODE_TYPES.ExportNamedDeclaration,
  AST_NODE_TYPES.ExportDefaultDeclaration,
  AST_NODE_TYPES.ImportDeclaration,
  AST_NODE_TYPES.TSInterfaceDeclaration,
  AST_NODE_TYPES.TSTypeAliasDeclaration,
  AST_NODE_TYPES.TSEnumDeclaration,
]);

/** A paragraph: one Block comment, or a run of adjacent Line comments. */
type Paragraph = TSESTree.Comment[];

export const rule = createRule({
  name: 'no-paragraph-comments',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow multi-line comment paragraphs at file top and paragraph comments floating above non-declaration code',
    },
    messages: {
      fileTopRun:
        'Run of line comments at the top of the file. Move this content into JSDoc on the relevant declaration.',
      floatingParagraph:
        'Paragraph comment floating above non-declaration code. Attach it to a declaration as JSDoc or reduce it to a single why-comment.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const { sourceCode } = context;

    const isShebang = (comment: TSESTree.Comment): boolean =>
      comment.range[0] === 0 && sourceCode.text.startsWith('#!');

    const isDirective = (comment: TSESTree.Comment): boolean =>
      comment.value.trim().startsWith('eslint');

    const isTrailing = (comment: TSESTree.Comment): boolean => {
      const before = sourceCode.getTokenBefore(comment, {
        includeComments: false,
      });
      return before !== null && before.loc.end.line === comment.loc.start.line;
    };

    /** Climb from the innermost node at `index` to its statement. */
    const enclosingStatement = (index: number): TSESTree.Node | null => {
      let node = sourceCode.getNodeByRangeIndex(index);
      while (
        node?.parent &&
        node.parent.type !== AST_NODE_TYPES.Program &&
        node.parent.range[0] === node.range[0]
      ) {
        node = node.parent;
      }
      return node;
    };

    /** Group comments into paragraphs: Line runs joined by adjacent lines. */
    const toParagraphs = (comments: TSESTree.Comment[]): Paragraph[] => {
      const paragraphs: Paragraph[] = [];
      for (const comment of comments) {
        const current = paragraphs.at(-1);
        const previous = current?.at(-1);
        if (
          current !== undefined &&
          previous !== undefined &&
          previous.type === AST_TOKEN_TYPES.Line &&
          comment.type === AST_TOKEN_TYPES.Line &&
          previous.loc.end.line + 1 === comment.loc.start.line
        ) {
          current.push(comment);
        } else {
          paragraphs.push([comment]);
        }
      }
      return paragraphs;
    };

    const report = (
      paragraph: Paragraph,
      messageId: 'fileTopRun' | 'floatingParagraph',
    ): void => {
      context.report({
        loc: {
          start: paragraph[0]!.loc.start,
          end: paragraph.at(-1)!.loc.end,
        },
        messageId,
      });
    };

    return {
      Program(program) {
        const comments = sourceCode
          .getAllComments()
          .filter(
            (comment) =>
              !isShebang(comment) &&
              !isDirective(comment) &&
              !isTrailing(comment),
          );
        const fileTopBoundary = program.body[0]?.range[0] ?? Infinity;

        for (const paragraph of toParagraphs(comments)) {
          const first = paragraph[0]!;
          const last = paragraph.at(-1)!;

          if (last.range[0] < fileTopBoundary) {
            // File top: only 2+ line runs are paragraphs; single comments and block headers (license etc.) are exempt.
            if (paragraph.length >= 2) {
              report(paragraph, 'fileTopRun');
            }
            continue;
          }

          // (b) Elsewhere: a block comment or a multi-line run is a
          // paragraph unless it is attached to a declaration.
          const isParagraphShaped =
            first.type === AST_TOKEN_TYPES.Block || paragraph.length >= 2;
          if (!isParagraphShaped) {
            continue;
          }

          const next = sourceCode.getTokenAfter(last, {
            includeComments: false,
          });
          if (next === null) {
            continue; // Dangling comment at end of file: nothing below it.
          }

          const statement = enclosingStatement(next.range[0]);
          const attached =
            next.loc.start.line - last.loc.end.line <= 1 &&
            statement !== null &&
            declarationTypes.has(statement.type);
          if (!attached) {
            report(paragraph, 'floatingParagraph');
          }
        }
      },
    };
  },
});
