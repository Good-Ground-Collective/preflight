import { existsSync } from 'node:fs';
import path from 'node:path';

/** Finds the package a file belongs to: the nearest folder above it holding a `package.json`. */
export class PackageRootFinder {
  rootOf(filename: string): string | null {
    let directory = path.dirname(filename);
    for (;;) {
      if (existsSync(path.join(directory, 'package.json'))) return directory;
      const parent = path.dirname(directory);
      if (parent === directory) return null;
      directory = parent;
    }
  }
}

export const packageRoots = new PackageRootFinder();
