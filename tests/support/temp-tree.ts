import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** A throwaway package on disk for the filesystem rules to read. */
export class TempTree {
  readonly root = mkdtempSync(path.join(tmpdir(), 'preflight-layout-'));

  constructor(props: { files: readonly string[] }) {
    for (const relative of ['package.json', ...props.files]) {
      const target = path.join(this.root, relative);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, relative === 'package.json' ? '{}' : '');
    }
  }

  at(relative: string): string {
    return path.join(this.root, relative);
  }
}
