/**
 * Compiles the glob subset rule options use — `**`, `*` and `?` — into regular
 * expressions over `/`-separated paths, so no glob library is needed.
 */
export class GlobMatcher {
  private readonly patterns: RegExp[];

  constructor(globs: readonly string[]) {
    this.patterns = globs.map((glob) => this.compile(glob));
  }

  matches(filePath: string): boolean {
    return this.patterns.some((pattern) => pattern.test(filePath));
  }

  private compile(glob: string): RegExp {
    let source = '';
    for (let index = 0; index < glob.length; index += 1) {
      const char = glob[index]!;
      if (glob.startsWith('**/', index)) {
        source += '(?:.*/)?';
        index += 2;
      } else if (glob.startsWith('**', index)) {
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
    return new RegExp(`^${source}$`, 'u');
  }
}
