# no-paragraph-comments

Disallow multi-line comment paragraphs at the top of a file and paragraph
comments floating above non-declaration code.

## Why

The charter (M-2) bans narrative comment blocks: multi-line `//` paragraphs at
file top and paragraph block comments hovering over non-declaration code.
Concepts belong in JSDoc on the declaration they describe, where tooling can
surface them and refactors keep them adjacent to the code. Floating prose
drifts out of date and gets flagged late in review; this rule catches it at
lint time.

## What it flags

1. **File-top runs**: two or more consecutive `//` line comments before the
   first statement (a blank line breaks the run).
2. **Floating paragraphs**: a block comment, or a run of two or more
   consecutive `//` line comments, that is not attached to a declaration —
   either because a blank line separates it from the code below, or because
   the code below is not a declaration (an expression statement, an `if`, a
   `return`, ...).

A comment counts as **attached** only when there is no blank line between it
and the next statement AND that statement is a declaration
(`function`, `class`, `const`/`let`/`var`, `import`, `export`, `interface`,
`type`, `enum`).

## What it leaves alone

- JSDoc (or any comment) attached directly to a declaration.
- A single `//` why-comment above any line of code.
- A single trailing comment on the same line as code.
- `eslint-*` directive comments (`/* eslint-disable */`,
  `// eslint-disable-next-line ...`).
- Block comments at file top (license/copyright headers).
- A shebang (`#!/usr/bin/env node`).

## Examples

### Incorrect

```ts
// This module handles the frobnicator.
// It was written long ago.
// Beware of dragons.
export const frob = 1;
```

```ts
/* narrative paragraph about what happens next */
doThing();
```

```ts
function main() {
  // check readiness first
  // bail out early otherwise
  if (!ready) {
    return;
  }
}
```

```ts
/* configuration notes that drifted from the code */

const config = { seed };
```

### Correct

```ts
/**
 * Adds two numbers.
 */
export function add(a: number, b: number): number {
  return a + b;
}
```

```ts
// accumulate before flush to avoid double-counting
flush(total);
```

```ts
/*
 * Copyright (c) 2026 Good Ground Collective.
 * SPDX-License-Identifier: MIT
 */

import { run } from './run.js';
```

```ts
const x = 1; // why: seed value
```

## Options

None.
