import path from 'node:path';
import { GlobPattern } from './glob-pattern.js';
import type { LayoutViolation } from './layout-violation.js';
import type { LintedFile } from './linted-file.js';
import { ModuleFinder } from './module-finder.js';
import type { ModuleLayoutOptions } from './module-layout-options.js';
import { sourceFileKinds } from './source-file-kinds.js';

export type ModuleLayoutMessageId =
  | 'topLevelFile'
  | 'topLevelDir'
  | 'moduleRootFile'
  | 'moduleRootDir'
  | 'flatFile'
  | 'nestedFile';

type Violation = LayoutViolation<ModuleLayoutMessageId> | null;

/** Decides whether one file sits where the configured module → role → concept layout expects. */
export class ModuleLayoutChecker {
  private readonly options: ModuleLayoutOptions;
  private readonly file: LintedFile;
  private readonly rootDirectory: string;

  constructor(props: { options: ModuleLayoutOptions; file: LintedFile }) {
    this.options = props.options;
    this.file = props.file;
    this.rootDirectory = path.resolve(this.file.packageRoot, this.options.root ?? '.');
  }

  private get rootLabel(): string {
    return this.options.root ?? '.';
  }

  check(): Violation {
    const segments = this.file.segmentsBelow(this.rootDirectory);
    if (segments === null) return null;
    const moduleDirectory =
      this.options.module === undefined
        ? null
        : new ModuleFinder({
            recognition: this.options.module,
            packageRoot: this.file.packageRoot,
          }).moduleOf(this.file.absolute, this.rootDirectory);
    return moduleDirectory === null
      ? this.checkTopLevel(segments)
      : this.checkInModule(moduleDirectory);
  }

  private checkTopLevel(segments: string[]): Violation {
    const [entry = ''] = segments;
    const { dirs, files } = this.options.topLevel ?? {};
    if (segments.length === 1) {
      if (files === undefined || this.matchesAny(files, entry)) return null;
      return {
        messageId: 'topLevelFile',
        data: { entry, root: this.rootLabel, allowed: this.list(files) },
      };
    }
    if (dirs === undefined || this.matchesAny(dirs, entry)) return null;
    return {
      messageId: 'topLevelDir',
      data: { entry, root: this.rootLabel, allowed: this.list(dirs, '/') },
    };
  }

  private checkInModule(moduleDirectory: string): Violation {
    const segments = this.file.segmentsBelow(moduleDirectory) ?? [];
    const file = segments.pop() ?? '';
    const moduleName = path.basename(moduleDirectory);
    const [first] = segments;
    if (first === undefined) return this.checkModuleRootFile(file, moduleName);

    const roles = this.options.roles ?? [];
    const dirs = this.options.moduleRoot?.dirs ?? [];
    if (roles.includes(first)) return this.checkInRole(first, segments.slice(1), file);
    if (this.options.roles === undefined && this.options.moduleRoot?.dirs === undefined) {
      return null;
    }
    if (dirs.includes(first)) return null;
    return {
      messageId: 'moduleRootDir',
      data: {
        folder: first,
        module: moduleName,
        allowed: this.list([...dirs, ...roles], '/'),
        expected: this.expectedInRole(file),
      },
    };
  }

  private checkModuleRootFile(file: string, moduleName: string): Violation {
    const configured = this.options.moduleRoot?.files;
    if (configured === undefined) return null;
    const allowed = configured.map((name) => name.replaceAll('<module>', moduleName));
    if (this.options.module?.marker !== undefined) allowed.push(this.options.module.marker);
    if (this.matchesAny(allowed, file)) return null;
    return {
      messageId: 'moduleRootFile',
      data: {
        file,
        module: moduleName,
        allowed: this.list(allowed),
        expected: this.expectedInRole(file),
      },
    };
  }

  private checkInRole(role: string, folders: string[], file: string): Violation {
    const testsAt = folders.indexOf(sourceFileKinds.testsFolder);
    const concepts = testsAt === -1 ? folders : folders.slice(0, testsAt);
    const testsPath = testsAt === -1 ? '' : `${folders.slice(testsAt).join('/')}/`;
    if (this.options.conceptFolders === true && concepts.length === 0) {
      return {
        messageId: 'flatFile',
        data: { file, role, expected: `${role}/<concept>/${testsPath}${file}` },
      };
    }
    const maxDepth = this.options.maxConceptDepth;
    if (maxDepth !== undefined && concepts.length > maxDepth) {
      const kept = concepts.slice(0, maxDepth).map((folder) => `${folder}/`).join('');
      return {
        messageId: 'nestedFile',
        data: { file, role, expected: `${role}/${kept}${testsPath}${file}` },
      };
    }
    return null;
  }

  private expectedInRole(file: string): string {
    const concept = this.options.conceptFolders === true ? '<concept>/' : '';
    return `<role>/${concept}${file}`;
  }

  private matchesAny(patterns: readonly string[], value: string): boolean {
    return patterns.some((pattern) => new GlobPattern({ pattern }).matches(value));
  }

  private list(names: readonly string[], suffix = ''): string {
    return names.length === 0 ? '(none)' : names.map((name) => `${name}${suffix}`).join(', ');
  }
}
