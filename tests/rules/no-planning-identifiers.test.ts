import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-planning-identifiers.js';

const ruleTester = new RuleTester();

// Invalid case 1: exact location math for a match inside a line comment.
const commentHitCode = 'const redirect = url; // resolves D-09 open redirect';
const commentHitColumn = commentHitCode.indexOf('D-09') + 1;
const commentHitOutput = commentHitCode.slice(0, commentHitCode.indexOf('//'));

// Invalid case: exact location math for a string literal hit (reported on the node).
const literalHitCode = "const doc = 'see PLAN.md';";
const literalStart = literalHitCode.indexOf("'") + 1;
const literalEnd = literalHitCode.lastIndexOf("'") + 2;

ruleTester.run('no-planning-identifiers', rule, {
  valid: [
    // Clean comments describe the code on its own terms.
    '// implements the parser',
    '/* deployment checklist */',
    // "phase" without a digit does not match `Phase \d` (case-sensitive, digit required).
    "const label = 'phase one of the moon';",
    // Non-string literals are skipped entirely.
    'const n = 404;',
    'const re = /Phase \\d/g;',
    // Template literal with no planning identifiers.
    'const msg = `deploys ${target} cleanly`;',
    // ESLint directive comments are exempt, even when they contain a match.
    "// eslint-disable-next-line @rule-tester/no-planning-identifiers -- tracking ABC-12\nconst doc = 'PLAN.md';",
    "/* eslint-disable @rule-tester/no-planning-identifiers -- cleanup for REQ-42 */\nconst doc = 'PLAN.md';",
    // Custom patterns do not fire on clean code.
    {
      code: '// clean comment',
      options: [{ patterns: ['TICKET-\\d+'] }],
    },
  ],
  invalid: [
    // Line comment: accurate loc inside the comment + removal suggestion.
    {
      code: commentHitCode,
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'D-09', kind: 'comment' },
          line: 1,
          column: commentHitColumn,
          endLine: 1,
          endColumn: commentHitColumn + 'D-09'.length,
          suggestions: [
            { messageId: 'removeComment', output: commentHitOutput },
          ],
        },
      ],
    },
    // Block comment hit with removal suggestion.
    {
      code: '/* Phase 2: wire the adapters */\nexport const x = 1;',
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'Phase 2', kind: 'comment' },
          line: 1,
          suggestions: [
            { messageId: 'removeComment', output: '\nexport const x = 1;' },
          ],
        },
      ],
    },
    // Multiple matches in one comment each report, each suggesting removal.
    {
      code: '// Phase 2 covers D-09',
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'Phase 2', kind: 'comment' },
          suggestions: [{ messageId: 'removeComment', output: '' }],
        },
        {
          messageId: 'planningIdentifier',
          data: { match: 'D-09', kind: 'comment' },
          suggestions: [{ messageId: 'removeComment', output: '' }],
        },
      ],
    },
    // String literal hit: reported on the node, no suggestion (rewriting a
    // string can change runtime behavior).
    {
      code: literalHitCode,
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'PLAN.md', kind: 'string' },
          line: 1,
          column: literalStart,
          endLine: 1,
          endColumn: literalEnd,
          suggestions: [],
        },
      ],
    },
    {
      code: "const c = 'CONTEXT.md';",
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'CONTEXT.md', kind: 'string' },
          suggestions: [],
        },
      ],
    },
    // Template literal quasi hit: reported, no suggestion.
    {
      code: 'const note = `carried over from a previous phase: ${flag}`;',
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'from a previous phase', kind: 'template literal' },
          suggestions: [],
        },
      ],
    },
    // REQ-ID style pattern matches each occurrence.
    {
      code: '// satisfies REQ-42 and REQ-43',
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'REQ-42', kind: 'comment' },
          suggestions: [{ messageId: 'removeComment', output: '' }],
        },
        {
          messageId: 'planningIdentifier',
          data: { match: 'REQ-43', kind: 'comment' },
          suggestions: [{ messageId: 'removeComment', output: '' }],
        },
      ],
    },
    {
      code: '// finishes T-4-05',
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'T-4-05', kind: 'comment' },
          suggestions: [{ messageId: 'removeComment', output: '' }],
        },
      ],
    },
    // User patterns extend the defaults: TICKET-14 is hit by both the default
    // `[A-Z]{3,}-\d\d` pattern and the custom `TICKET-\d+` pattern.
    {
      code: '// TICKET-14 blocked on infra',
      options: [{ patterns: ['TICKET-\\d+'] }],
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'TICKET-14', kind: 'comment' },
          suggestions: [{ messageId: 'removeComment', output: '' }],
        },
        {
          messageId: 'planningIdentifier',
          data: { match: 'TICKET-14', kind: 'comment' },
          suggestions: [{ messageId: 'removeComment', output: '' }],
        },
      ],
    },
    // Custom pattern that the defaults cannot reach (single digit).
    {
      code: '// TICKET-9 blocked on infra',
      options: [{ patterns: ['TICKET-\\d+'] }],
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'TICKET-9', kind: 'comment' },
          suggestions: [{ messageId: 'removeComment', output: '' }],
        },
      ],
    },
    // Defaults stay active when custom patterns are supplied.
    {
      code: "const doc = 'PLAN.md';",
      options: [{ patterns: ['TICKET-\\d+'] }],
      errors: [
        {
          messageId: 'planningIdentifier',
          data: { match: 'PLAN.md', kind: 'string' },
          suggestions: [],
        },
      ],
    },
  ],
});
