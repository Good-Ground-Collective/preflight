import { LintedFile } from './linted-file.js';

/** Builds a `LintedFile` for a real file on disk, skipping processor blocks and stdin. */
export class LintedFileResolver {
  resolve(props: {
    filename: string;
    physicalFilename: string;
    cwd: string;
  }): LintedFile | null {
    if (props.filename !== props.physicalFilename) return null;
    if (props.filename.startsWith('<')) return null;
    return new LintedFile({ filename: props.filename, cwd: props.cwd });
  }
}

export const lintedFiles = new LintedFileResolver();
