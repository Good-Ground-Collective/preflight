import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../src/rules/no-paragraph-comments.js';

// Two valid fixtures carry inert eslint-* directives (RuleTester only runs
// this rule), so unused-directive reporting must be off for this tester.
const ruleTester = new RuleTester({
  linterOptions: { reportUnusedDisableDirectives: false },
});

ruleTester.run('no-paragraph-comments', rule, {
  valid: [
    // JSDoc attached (no blank line) to an exported declaration.
    `/**
 * Adds two numbers.
 */
export function add(a: number, b: number): number {
  return a + b;
}`,
    // Single why-comment above a non-declaration line.
    `declare function flush(n: number): void;
const total = 0;
// accumulate before flush to avoid double-counting
flush(total);`,
    // eslint directive header at file top.
    `/* eslint-disable no-console */
console.log('hi');`,
    // eslint line directive above a non-declaration statement.
    `declare const b: number;
// eslint-disable-next-line no-console
console.log(b);`,
    // Single trailing comment.
    `const x = 1; // why: seed value`,
    // Single line comment at file top.
    `// entry point
import { run } from './run.js';
run();`,
    // A blank line splits two file-top comments into two single-line
    // paragraphs, not a run.
    `// first note

// second note
const y = 2;`,
    // Block license header at file top is exempt.
    `/*
 * Copyright (c) 2026 Good Ground Collective.
 * SPDX-License-Identifier: MIT
 */

import { run } from './run.js';
run();`,
    // Block header attached to an ImportDeclaration mid-file style:
    // ImportDeclaration is a declaration, so the comment is attached.
    `import { boot } from './boot.js';
/* wires the boot sequence into the module registry */
import { registry } from './registry.js';
boot(registry);`,
    // Block comment attached (no blank line) to a class declaration.
    `const a = 1;
/** Service wrapper. */
class Service {}`,
    // Two line comments attached (no blank line) to a function declaration.
    `const c = 3;
// helper used by tests
// kept separate for tree-shaking
function helper() {
  return c;
}`,
    // Comment-only file with a single comment.
    `// just a note`,
    // Shebang plus a single file-top comment.
    `#!/usr/bin/env node
// boot note
import { main } from './main.js';
main();`,
  ],
  invalid: [
    // Run of 3 consecutive line comments at file top.
    {
      code: `// This module handles the frobnicator.
// It was written long ago.
// Beware of dragons.
export const frob = 1;`,
      errors: [
        {
          messageId: 'fileTopRun',
          line: 1,
          column: 1,
          endLine: 3,
        },
      ],
    },
    // Run of 2 consecutive line comments at file top, even above a
    // declaration-attached position (file-top runs are always flagged).
    {
      code: `// grab-bag of setup notes
// that should live in JSDoc
import { setup } from './setup.js';
setup();`,
      errors: [
        {
          messageId: 'fileTopRun',
          line: 1,
          endLine: 2,
        },
      ],
    },
    // Narrative block comment floating above an expression statement.
    {
      code: `declare function doThing(): void;
/* narrative paragraph about what happens next */
doThing();`,
      errors: [
        {
          messageId: 'floatingParagraph',
          line: 2,
        },
      ],
    },
    // Two-line line-comment paragraph above an if statement.
    {
      code: `declare const ready: boolean;
function main() {
  // check readiness first
  // bail out early otherwise
  if (!ready) {
    return;
  }
}`,
      errors: [
        {
          messageId: 'floatingParagraph',
          line: 3,
          endLine: 4,
        },
      ],
    },
    // Block comment separated from a declaration by a blank line floats.
    {
      code: `const seed = 1;
/* configuration notes that drifted from the code */

const config = { seed };
export default config;`,
      errors: [
        {
          messageId: 'floatingParagraph',
          line: 2,
        },
      ],
    },
    // Comment-only file: a run of line comments is still a file-top run.
    {
      code: `// line one of an orphaned paragraph
// line two of an orphaned paragraph`,
      errors: [
        {
          messageId: 'fileTopRun',
          line: 1,
          endLine: 2,
        },
      ],
    },
  ],
});
