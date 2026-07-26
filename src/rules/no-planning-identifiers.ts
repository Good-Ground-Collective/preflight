import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

/**
 * Built-in patterns are always active; user-supplied `patterns` extend them.
 * They are kept deliberately specific (digits required, exact file names) —
 * note that the uppercase-prefix pattern matches any ticket-style ID,
 * including todo-style tags with two digits; see the rule docs.
 */
const defaultPatterns = [
  'Phase \\d',
  'D-\\d\\d',
  'T-\\d-\\d\\d',
  '[A-Z]{3,}-\\d\\d',
  'PLAN\\.md',
  'CONTEXT\\.md',
  // eslint-disable-next-line preflight/no-planning-identifiers -- the pattern list must spell out the phrases it bans
  'from a previous phase',
];

type Options = [{ patterns?: string[] }];
type MessageIds = 'planningIdentifier' | 'removeComment';

export const rule = createRule<Options, MessageIds>({
  name: 'no-planning-identifiers',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow planning-system identifiers (phase numbers, ticket IDs, plan-file names) in comments and strings',
    },
    hasSuggestions: true,
    messages: {
      planningIdentifier:
        "Planning-system identifier '{{match}}' in {{kind}}. Planning references outlive the systems that gave them meaning; describe the code on its own terms.",
      removeComment: 'Remove this comment.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          patterns: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ patterns: [] }],
  create(context, [options]) {
    const { sourceCode } = context;
    const regexes = [...defaultPatterns, ...(options.patterns ?? [])].map(
      (pattern) => {
        try {
          return new RegExp(pattern, 'g');
        } catch (error) {
          throw new Error(
            `no-planning-identifiers: invalid pattern ${JSON.stringify(pattern)}: ${String(error)}`,
          );
        }
      },
    );

    function reportNodeMatches(
      node: TSESTree.Node,
      text: string,
      kind: string,
    ): void {
      for (const regex of regexes) {
        for (const match of text.matchAll(regex)) {
          context.report({
            node,
            messageId: 'planningIdentifier',
            data: { match: match[0], kind },
          });
        }
      }
    }

    return {
      Literal(node): void {
        if (typeof node.value !== 'string') {
          return;
        }
        reportNodeMatches(node, node.value, 'string');
      },
      TemplateElement(node): void {
        reportNodeMatches(node, node.value.cooked ?? node.value.raw, 'template literal');
      },
      'Program:exit'(): void {
        for (const comment of sourceCode.getAllComments()) {
          // ESLint directive comments legitimately reference rule machinery.
          if (comment.value.trim().startsWith('eslint')) {
            continue;
          }
          for (const regex of regexes) {
            for (const match of comment.value.matchAll(regex)) {
              // The comment's value starts 2 characters after its range
              // start (`//` or `/*`).
              const start = comment.range[0] + 2 + (match.index ?? 0);
              context.report({
                loc: {
                  start: sourceCode.getLocFromIndex(start),
                  end: sourceCode.getLocFromIndex(start + match[0].length),
                },
                messageId: 'planningIdentifier',
                data: { match: match[0], kind: 'comment' },
                suggest: [
                  {
                    messageId: 'removeComment',
                    fix: (fixer) => fixer.remove(comment),
                  },
                ],
              });
            }
          }
        }
      },
    };
  },
});
