import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import rule from '../../src/rules/no-switch-with-nested-if.js';

const ruleTester = new RuleTester();

ruleTester.run('no-switch-with-nested-if', rule, {
  valid: [
    // Plain switch with no `if` at all.
    'switch (x) { case 1: doA(); break; }',
    // `default:`-only switch without an `if`.
    'switch (x) { default: doA(); }',
    // `if` nested inside a `for` loop body within the case — deeper structure, not flagged.
    `switch (x) {
      case 1:
        for (const item of items) {
          if (item.ok) doA(item);
        }
        break;
    }`,
    // `if` inside a `while` loop within the case.
    `switch (x) {
      case 1: {
        while (running) {
          if (done) break;
        }
        break;
      }
    }`,
    // `if` inside a `try` block within the case.
    `switch (x) {
      case 1:
        try {
          if (y) doA();
        } catch {
          doB();
        }
        break;
    }`,
    // `if` inside a callback defined within the case.
    `switch (x) {
      case 1:
        items.forEach((item) => {
          if (item.ok) doA(item);
        });
        break;
    }`,
    // `if` two block levels deep — beyond the one-block-deep spec, not flagged.
    `switch (x) {
      case 1: {
        {
          if (y) doA();
        }
        break;
      }
    }`,
    // `if` outside any switch is none of this rule's business.
    'if (y) doA();',
    // `if` containing a switch (inverse nesting) is fine.
    `if (y) {
      switch (x) {
        case 1:
          doA();
          break;
      }
    }`,
  ],
  invalid: [
    {
      // Direct child of SwitchCase.consequent.
      code: 'switch (x) { case 1: if (y) doA(); break; }',
      errors: [
        {
          messageId: 'nestedIf',
          data: { discriminant: 'x' },
          type: AST_NODE_TYPES.IfStatement,
        },
      ],
    },
    {
      // One block-statement deep inside the case.
      code: 'switch (x) { case 2: { if (y) { doB(); } break; } }',
      errors: [
        {
          messageId: 'nestedIf',
          data: { discriminant: 'x' },
          type: AST_NODE_TYPES.IfStatement,
        },
      ],
    },
    {
      // Fires for `default:` cases too.
      code: 'switch (x) { default: if (z) doC(); }',
      errors: [
        {
          messageId: 'nestedIf',
          data: { discriminant: 'x' },
          type: AST_NODE_TYPES.IfStatement,
        },
      ],
    },
    {
      // Position among case statements is irrelevant.
      code: `switch (x) {
        case 1:
          doA();
          if (y) doB();
          break;
      }`,
      errors: [
        {
          messageId: 'nestedIf',
          data: { discriminant: 'x' },
          type: AST_NODE_TYPES.IfStatement,
        },
      ],
    },
    {
      // if/else-if chain reports once, on the outermost `if`.
      code: `switch (x) {
        case 1:
          if (y) doA();
          else if (z) doB();
          break;
      }`,
      errors: [
        {
          messageId: 'nestedIf',
          data: { discriminant: 'x' },
          type: AST_NODE_TYPES.IfStatement,
          line: 3,
        },
      ],
    },
    {
      // Multiple offending cases each report independently.
      code: `switch (x) {
        case 1:
          if (y) doA();
          break;
        case 2: {
          if (z) doB();
          break;
        }
      }`,
      errors: [
        {
          messageId: 'nestedIf',
          data: { discriminant: 'x' },
          type: AST_NODE_TYPES.IfStatement,
          line: 3,
        },
        {
          messageId: 'nestedIf',
          data: { discriminant: 'x' },
          type: AST_NODE_TYPES.IfStatement,
          line: 6,
        },
      ],
    },
    {
      // Nested inner switch: the `if` belongs to the inner switch's case and
      // reports exactly once, naming the inner discriminant.
      code: `switch (outer) {
        case 1:
          switch (inner) {
            case 2:
              if (y) doA();
              break;
          }
          break;
      }`,
      errors: [
        {
          messageId: 'nestedIf',
          data: { discriminant: 'inner' },
          type: AST_NODE_TYPES.IfStatement,
          line: 5,
        },
      ],
    },
    {
      // Early-guard `if (!valid) return;` directly in a case is flagged by
      // definition — accepted trade-off per the charter.
      code: `function handle(x: number, valid: boolean) {
        switch (x) {
          case 1:
            if (!valid) return;
            doA();
            break;
        }
      }`,
      errors: [
        {
          messageId: 'nestedIf',
          data: { discriminant: 'x' },
          type: AST_NODE_TYPES.IfStatement,
        },
      ],
    },
    {
      // Non-identifier discriminant is echoed verbatim in the message data.
      code: 'switch (kind()) { case 1: if (y) doA(); break; }',
      errors: [
        {
          messageId: 'nestedIf',
          data: { discriminant: 'kind()' },
          type: AST_NODE_TYPES.IfStatement,
        },
      ],
    },
  ],
});
