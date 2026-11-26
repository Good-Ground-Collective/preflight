import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Locates the nearest folder holding a `package.json`, caching each folder's
 * answer so a lint run touches the filesystem once per directory.
 */
export class PackageRootFinder {
  private readonly cache = new Map<string, string | null>();

  find(directory: string): string | null {
    const cached = this.cache.get(directory);
    if (cached !== undefined) return cached;
    const parent = path.dirname(directory);
    const root = existsSync(path.join(directory, 'package.json'))
      ? directory
      : parent === directory
        ? null
        : this.find(parent);
    this.cache.set(directory, root);
    return root;
  }
}

export const packageRootFinder = new PackageRootFinder();
