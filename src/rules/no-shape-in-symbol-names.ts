import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

type Options = [{ terms?: string[] }];

/**
 * A symbol named for its structure ("shape") describes how a value is laid out
 * rather than what owns it, which is the naming habit this rule rejects. The
 * banned terms are matched case-insensitively as substrings. Ported from the
 * anti-slop oxlint plugin (MIT, dmmulroy/anti-slop), which hardcodes `shape`;
 * `terms` is preflight's addition so consumers can extend the list.
 */
export const rule = createRule<Options, 'forbiddenSymbolName'>({
  name: 'no-shape-in-symbol-names',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow structural terms such as "shape" in JavaScript, TypeScript, private, and JSX symbol names',
    },
    messages: {
      forbiddenSymbolName:
        'Rename symbol "{{name}}" for its domain role; "{{term}}" describes structure rather than ownership.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          terms: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Case-insensitive substrings banned from symbol names. Replaces the default list.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ terms: ['shape'] }],
  create(context, [{ terms = ['shape'] }]) {
    const lowercased = terms.map((term) => term.toLowerCase());

    function report(node: TSESTree.Node & { name: string }): void {
      const name = node.name.toLowerCase();
      const term = lowercased.find((candidate) => name.includes(candidate));
      if (term === undefined) return;
      context.report({
        node,
        messageId: 'forbiddenSymbolName',
        data: { name: node.name, term },
      });
    }

    return {
      Identifier: report,
      PrivateIdentifier: report,
      JSXIdentifier: report,
    };
  },
});
