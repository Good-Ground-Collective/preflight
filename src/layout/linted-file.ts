import path from 'node:path';
import { packageRoots } from './package-root-finder.js';

/** Where a linted file sits on disk, resolved against the package that owns it. */
export class LintedFile {
  readonly absolute: string;
  readonly packageRoot: string;

  constructor(props: { filename: string; cwd: string }) {
    this.absolute = path.resolve(props.cwd, props.filename);
    this.packageRoot = packageRoots.rootOf(this.absolute) ?? props.cwd;
  }

  get name(): string {
    return path.basename(this.absolute);
  }

  get directory(): string {
    return path.dirname(this.absolute);
  }

  /** The folders from `ancestor` down to this file, or `null` when the file is not below `ancestor`. */
  segmentsBelow(ancestor: string): string[] | null {
    const relative = path.relative(ancestor, this.absolute);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
      return null;
    }
    return relative.split(path.sep);
  }
}
