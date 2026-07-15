import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils.js';

/**
 * Charter M-10: a `switch` containing nested `if` statements is a smell to be
 * flattened. Flags an `if` that is a direct child of a case's consequent, or
 * one block-statement deep inside it. Deeper structures (loop bodies, `try`
 * blocks, callbacks) are deliberately left alone.
 */
export default createRule({
  name: 'no-switch-with-nested-if',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow `if` statements nested directly inside `switch` cases',
    },
    messages: {
      nestedIf:
        'Unexpected `if` inside a case of `switch ({{ discriminant }})`. Flatten the branching (split cases, extract a function, or use a lookup) instead of nesting conditionals.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.IfStatement): void {
      // Climb SwitchCase (or BlockStatement > SwitchCase) up to the
      // SwitchStatement to name its discriminant in the message.
      let ancestor = node.parent;
      while (ancestor.type !== 'SwitchStatement') {
        ancestor = ancestor.parent as TSESTree.Node;
      }
      context.report({
        node,
        messageId: 'nestedIf',
        data: {
          discriminant: context.sourceCode.getText(ancestor.discriminant),
        },
      });
    }

    return {
      'SwitchCase > IfStatement, SwitchCase > BlockStatement > IfStatement':
        report,
    };
  },
});
