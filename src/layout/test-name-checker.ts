import path from 'node:path';
import { directories } from './directory-reader.js';
import type { LayoutViolation } from './layout-violation.js';
import type { LintedFile } from './linted-file.js';
import type { ModuleRecognition } from './module-finder.js';
import { ModuleFinder } from './module-finder.js';
import { sourceFileKinds } from './source-file-kinds.js';

export type TestNameMessageId = 'unknownSuffix' | 'noMatchingSource';

/** Options for `test-file-naming`. */
export interface TestNameOptions {
  readonly suffixes: readonly string[];
  readonly matchSource: 'concept' | 'off';
  readonly module?: ModuleRecognition | undefined;
}

type Violation = LayoutViolation<TestNameMessageId> | null;

/** Decides whether a test file uses an allowed suffix and, inside a concept's `__tests__/`, names a source file beside it. */
export class TestNameChecker {
  private readonly options: TestNameOptions;
  private readonly file: LintedFile;

  constructor(props: { options: TestNameOptions; file: LintedFile }) {
    this.options = props.options;
    this.file = props.file;
  }

  check(): Violation {
    const { name } = this.file;
    const stem = sourceFileKinds.withoutExtension(name);
    if (!sourceFileKinds.isSource(name)) return null;
    const suffix = this.suffixOf(stem);
    if (suffix === null) {
      if (!sourceFileKinds.isTest(name)) return null;
      return {
        messageId: 'unknownSuffix',
        data: { file: name, allowed: this.options.suffixes.map((s) => `.${s}`).join(', ') },
      };
    }
    if (this.options.matchSource === 'off') return null;
    if (path.basename(this.file.directory) !== sourceFileKinds.testsFolder) return null;
    const owner = path.dirname(this.file.directory);
    if (this.isModuleFolder(owner)) return null;
    const subject = stem.slice(0, -(suffix.length + 1));
    const hasSource = directories
      .fileNames(owner)
      .some(
        (sibling) =>
          sourceFileKinds.isProductionSource(sibling) &&
          sourceFileKinds.withoutExtension(sibling) === subject,
      );
    if (hasSource) return null;
    return {
      messageId: 'noMatchingSource',
      data: { file: name, subject, folder: path.basename(owner) },
    };
  }

  private suffixOf(stem: string): string | null {
    const bySpecificity = [...this.options.suffixes].sort((a, b) => b.length - a.length);
    return (
      bySpecificity.find(
        (suffix) => stem.endsWith(`.${suffix}`) && stem.length > suffix.length + 1,
      ) ?? null
    );
  }

  private isModuleFolder(directory: string): boolean {
    if (this.options.module === undefined) return false;
    return new ModuleFinder({
      recognition: this.options.module,
      packageRoot: this.file.packageRoot,
    }).isModule(directory);
  }
}
