import path from 'node:path';
import { directories } from './directory-reader.js';
import { GlobPattern } from './glob-pattern.js';

/** How a repo marks a folder as a module. */
export interface ModuleRecognition {
  /** A module is a folder holding a file whose name matches this glob. */
  readonly marker?: string;
  /** A module is a folder whose package-relative path matches this glob. */
  readonly match?: string;
}

/** Recognizes module folders by marker file or path glob, reading the disk on every query. */
export class ModuleFinder {
  private readonly marker: GlobPattern | null;
  private readonly match: GlobPattern | null;
  private readonly packageRoot: string;

  constructor(props: { recognition: ModuleRecognition; packageRoot: string }) {
    const { marker, match } = props.recognition;
    this.marker = marker === undefined ? null : new GlobPattern({ pattern: marker });
    this.match = match === undefined ? null : new GlobPattern({ pattern: match });
    this.packageRoot = props.packageRoot;
  }

  isModule(directory: string): boolean {
    if (this.match !== null) {
      const relative = path
        .relative(this.packageRoot, directory)
        .split(path.sep)
        .join('/');
      if (this.match.matches(relative)) return true;
    }
    if (this.marker !== null) {
      const marker = this.marker;
      return directories.fileNames(directory).some((name) => marker.matches(name));
    }
    return false;
  }

  /** The nearest module folder holding `filename`, searching folders strictly below `boundary`. */
  moduleOf(filename: string, boundary: string): string | null {
    let directory = path.dirname(filename);
    while (this.isStrictlyInside(directory, boundary)) {
      if (this.isModule(directory)) return directory;
      directory = path.dirname(directory);
    }
    return null;
  }

  private isStrictlyInside(directory: string, boundary: string): boolean {
    const relative = path.relative(boundary, directory);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  }
}
