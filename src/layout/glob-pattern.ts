/** A path glob: `**` spans folders, `*` and `?` stay within one path segment. */
export class GlobPattern {
  private readonly expression: RegExp;

  constructor(props: { pattern: string }) {
    let source = '';
    const { pattern } = props;
    for (let index = 0; index < pattern.length; index += 1) {
      const char = pattern[index]!;
      if (pattern.startsWith('**/', index)) {
        source += '(?:.*/)?';
        index += 2;
      } else if (pattern.startsWith('**', index)) {
        source += '.*';
        index += 1;
      } else if (char === '*') {
        source += '[^/]*';
      } else if (char === '?') {
        source += '[^/]';
      } else {
        source += char.replace(/[.+^${}()|[\]\\]/u, '\\$&');
      }
    }
    this.expression = new RegExp(`^${source}$`, 'u');
  }

  matches(value: string): boolean {
    return this.expression.test(value);
  }
}
