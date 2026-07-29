import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from '../../src/rules/no-paragraph-comments.js';

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
    // JSDoc attached to a method carrying an accessibility modifier.
    `class Service {
  /**
   * Fetches a record by id.
   * Throws when the record is absent.
   */
  public fetch(id: string): string {
    return id;
  }
}`,
    // JSDoc attached to a method with no accessibility modifier.
    `class Service {
  /**
   * Fetches a record by id.
   * Throws when the record is absent.
   */
  fetch(id: string): string {
    return id;
  }
}`,
    // JSDoc attached to a private method.
    `class Service {
  /**
   * Normalises the raw payload.
   * Callers outside the service never see this shape.
   */
  private normalise(raw: string): string {
    return raw;
  }
}`,
    // JSDoc attached to a static method.
    `class Service {
  /**
   * Builds a service from environment configuration.
   * Prefer this over the constructor.
   */
  static fromEnv(): Service {
    return new Service();
  }
}`,
    // JSDoc attached to a constructor.
    `class Service {
  /**
   * Wires the collaborators this service needs.
   * Kept private so callers go through fromEnv.
   */
  constructor(private readonly url: string) {}
}`,
    // JSDoc attached to a getter.
    `class Service {
  /**
   * The resolved base URL.
   * Computed once per call.
   */
  get baseUrl(): string {
    return 'https://example.test';
  }
}`,
    // JSDoc attached to a setter.
    `class Service {
  /**
   * Overrides the resolved base URL.
   * Intended for tests only.
   */
  set baseUrl(value: string) {
    void value;
  }
}`,
    // JSDoc attached to a class property holding an arrow function.
    `class Service {
  /**
   * Retries the operation with backoff.
   * Bound so it can be passed as a callback.
   */
  retry = (attempts: number): number => attempts;
}`,
    // JSDoc attached to a plain class property.
    `class Service {
  /**
   * How many attempts remain before giving up.
   * Decremented by retry.
   */
  attempts = 3;
}`,
    // JSDoc attached to an abstract method.
    `abstract class Service {
  /**
   * Fetches a record by id.
   * Implementations decide the transport.
   */
  abstract fetch(id: string): string;
}`,
    // JSDoc attached to an interface method signature.
    `interface Service {
  /**
   * Fetches a record by id.
   * Throws when the record is absent.
   */
  fetch(id: string): string;
}`,
    // JSDoc attached to an interface property signature.
    `interface Service {
  /**
   * The resolved base URL.
   * Always ends without a trailing slash.
   */
  baseUrl: string;
}`,
    // JSDoc attached to an interface index signature.
    `interface Registry {
  /**
   * Arbitrary handlers keyed by event name.
   * Keys are not validated.
   */
  [event: string]: () => void;
}`,
    // JSDoc attached to an enum member.
    `enum Status {
  /**
   * The job has been accepted but not started.
   * Terminal states never return here.
   */
  Pending = 'pending',
}`,
    // JSDoc attached to an object-literal method.
    `const service = {
  /**
   * Fetches a record by id.
   * Throws when the record is absent.
   */
  fetch(id: string): string {
    return id;
  },
};
export default service;`,
    // JSDoc attached to an object-literal property.
    `const config = {
  /**
   * How many attempts remain before giving up.
   * Decremented by retry.
   */
  attempts: 3,
};
export default config;`,
    // JSDoc attached to an ambient function declaration. Kept below another
    // statement so the file-top header exemption cannot mask the result.
    `const buffered = 0;
/**
 * Flushes the pending buffer.
 * Callers must not rely on ordering.
 */
declare function flush(n: number): void;`,
    // JSDoc attached to an abstract property.
    `abstract class Service {
  /**
   * The resolved base URL.
   * Implementations supply this.
   */
  abstract readonly baseUrl: string;
}`,
    // JSDoc attached to an auto-accessor property.
    `class Service {
  /**
   * How many attempts remain before giving up.
   * Exposed through a generated accessor pair.
   */
  accessor attempts = 3;
}`,
    // JSDoc attached to an abstract auto-accessor property.
    `abstract class Service {
  /**
   * How many attempts remain before giving up.
   * Implementations supply the initial value.
   */
  abstract accessor attempts: number;
}`,
    // JSDoc attached to an interface call signature.
    `interface Handler {
  /**
   * Invokes the handler.
   * Returns the count of processed records.
   */
  (event: string): number;
}`,
    // JSDoc attached to an interface construct signature.
    `interface ServiceConstructor {
  /**
   * Builds a service bound to the given URL.
   * Never throws.
   */
  new (url: string): object;
}`,
    // JSDoc attached to a namespace declaration.
    `const version = 1;
/**
 * Ambient helpers exposed to consumers.
 * Kept in a namespace for declaration merging.
 */
declare namespace helpers {
  const build: () => number;
}
export default version;`,
    // Two line comments attached (no blank line) to a method.
    `class Service {
  // helper used by the retry path
  // kept separate so it can be stubbed
  fetch(id: string): string {
    return id;
  }
}`,
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
    // A blank line detaches a paragraph from the method below it.
    {
      code: `class Service {
  /* notes that drifted away from the method they describe */

  fetch(id: string): string {
    return id;
  }
}`,
      errors: [
        {
          messageId: 'floatingParagraph',
          line: 2,
        },
      ],
    },
    // Paragraph floating above a statement inside a method body still floats:
    // members are declarations, the statements in their bodies are not.
    {
      code: `class Service {
  fetch(id: string): string {
    // narrative about the guard below
    // that belongs in the method JSDoc
    if (!id) {
      return '';
    }
    return id;
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
    // Block paragraph above a return inside a method body.
    {
      code: `class Service {
  fetch(id: string): string {
    /* narrative paragraph explaining the return value */
    return id;
  }
}`,
      errors: [
        {
          messageId: 'floatingParagraph',
          line: 3,
        },
      ],
    },
    // Block paragraph above an expression statement inside a constructor.
    {
      code: `declare function register(s: unknown): void;
class Service {
  constructor() {
    /* narrative paragraph about the registration side effect */
    register(this);
  }
}`,
      errors: [
        {
          messageId: 'floatingParagraph',
          line: 4,
        },
      ],
    },
    // A file-top run is still a file-top run in a class-shaped file.
    {
      code: `// This service handles the frobnicator.
// It was written long ago.
export class Service {}`,
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
