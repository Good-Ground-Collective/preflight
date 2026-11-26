import path from 'node:path';
import { directories } from './directory-reader.js';
import type { LayoutViolation } from './layout-violation.js';
import type { LintedFile } from './linted-file.js';
import { sourceFileKinds } from './source-file-kinds.js';

export type TestPlacementMessageId =
  | 'forbiddenRoot'
  | 'notInTestsFolder'
  | 'nestedTestsFolder'
  | 'orphanTestsFolder'
  | 'notAdjacent'
  | 'sourceInTestsFolder';

/** Options for `test-location`. */
export interface TestPlacementOptions {
  readonly style: 'tests-folder' | 'adjacent';
  readonly forbiddenRoots: readonly string[];
  readonly allowedSubfolders: readonly string[];
}

type Violation = LayoutViolation<TestPlacementMessageId> | null;

/** Decides whether a test, or a file inside `__tests__/`, sits where the configured style expects. */
export class TestPlacementChecker {
  private readonly options: TestPlacementOptions;
  private readonly file: LintedFile;
  private readonly folders: string[];

  constructor(props: { options: TestPlacementOptions; file: LintedFile }) {
    this.options = props.options;
    this.file = props.file;
    this.folders = (this.file.segmentsBelow(this.file.packageRoot) ?? []).slice(0, -1);
  }

  check(): Violation {
    const { name } = this.file;
    if (!sourceFileKinds.isSource(name)) return null;
    const isTest = sourceFileKinds.isTest(name);
    const testsAt = this.folders.lastIndexOf(sourceFileKinds.testsFolder);
    if (isTest) {
      const forbidden = this.forbiddenRoot();
      if (forbidden !== null) {
        return { messageId: 'forbiddenRoot', data: { file: name, root: forbidden } };
      }
    }
    if (this.options.style === 'adjacent') {
      return isTest && testsAt !== -1 ? this.notAdjacent(testsAt) : null;
    }
    if (testsAt === -1) {
      return isTest
        ? {
            messageId: 'notInTestsFolder',
            data: { file: name, expected: this.expectedTestPath(this.folders) },
          }
        : null;
    }
    const below = this.folders.slice(testsAt + 1);
    const [subfolder] = below;
    if (subfolder !== undefined && this.options.allowedSubfolders.includes(subfolder)) {
      return null;
    }
    if (!isTest) {
      return {
        messageId: 'sourceInTestsFolder',
        data: { file: name, allowed: this.subfolderList() },
      };
    }
    if (subfolder !== undefined) {
      return {
        messageId: 'nestedTestsFolder',
        data: {
          file: name,
          folder: subfolder,
          expected: this.expectedTestPath(this.folders.slice(0, testsAt)),
          allowed: this.subfolderList(),
        },
      };
    }
    return this.holdsSource(testsAt)
      ? null
      : { messageId: 'orphanTestsFolder', data: { file: name } };
  }

  private forbiddenRoot(): string | null {
    const relative = this.folders.join('/');
    return (
      this.options.forbiddenRoots.find((root) => {
        const prefix = root.replace(/\/+$/u, '');
        return relative === prefix || relative.startsWith(`${prefix}/`);
      }) ?? null
    );
  }

  private notAdjacent(testsAt: number): Violation {
    const owner = this.folders.slice(0, testsAt);
    return {
      messageId: 'notAdjacent',
      data: { file: this.file.name, expected: [...owner, this.file.name].join('/') },
    };
  }

  private holdsSource(testsAt: number): boolean {
    const parent = path.join(this.file.packageRoot, ...this.folders.slice(0, testsAt));
    return directories
      .entries(parent)
      .some((entry) =>
        entry.isDirectory()
          ? entry.name !== sourceFileKinds.testsFolder
          : entry.isFile() && sourceFileKinds.isProductionSource(entry.name),
      );
  }

  private expectedTestPath(owner: string[]): string {
    return [...owner, sourceFileKinds.testsFolder, this.file.name].join('/');
  }

  private subfolderList(): string {
    const { allowedSubfolders } = this.options;
    return allowedSubfolders.length === 0
      ? '(none)'
      : allowedSubfolders.map((name) => `__tests__/${name}/`).join(', ');
  }
}
