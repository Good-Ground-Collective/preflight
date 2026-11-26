import type { Dirent } from 'node:fs';
import { readdirSync } from 'node:fs';

/** Lists a folder on every call, so a long-lived editor session sees files as they change. */
export class DirectoryReader {
  entries(directory: string): Dirent[] {
    try {
      return readdirSync(directory, { withFileTypes: true });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error.code === 'ENOENT' || error.code === 'ENOTDIR')
      ) {
        return [];
      }
      throw error;
    }
  }

  fileNames(directory: string): string[] {
    return this.entries(directory)
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  }
}

export const directories = new DirectoryReader();
