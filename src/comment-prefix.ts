import type { TSESTree } from '@typescript-eslint/utils';

/**
 * Matches a comment whose text starts with `prefix`, ignoring leading
 * whitespace and `*`. A prefix ending in `:` allows whitespace before the
 * colon. `no-comments` and `require-safety-comment-for-type-assertion` share
 * it so a note one rule accepts is one the other accepts.
 */
export class CommentPrefix {
  private readonly pattern: RegExp;

  constructor(props: { prefix: string }) {
    const escaped = props.prefix
      .replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
      .replace(/:$/u, '\\s*:');
    this.pattern = new RegExp(`^${escaped}`, 'u');
  }

  matches(comment: TSESTree.Comment): boolean {
    return this.pattern.test(comment.value.replace(/^[\s*]+/u, ''));
  }
}

export const safetyPrefix = new CommentPrefix({ prefix: 'SAFETY:' });
