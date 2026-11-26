import type { ModuleRecognition } from './module-finder.js';

/** Options for `module-layout`. Each check runs only when its setting is present. */
export interface ModuleLayoutOptions {
  /** The folder, relative to the package root, that the layout governs. Defaults to the package root. */
  readonly root?: string;
  /** What may sit directly in `root` outside any module. */
  readonly topLevel?: {
    readonly dirs?: readonly string[];
    readonly files?: readonly string[];
  };
  readonly module?: ModuleRecognition;
  /** What may sit directly in a module folder besides role folders and submodules. `<module>` stands for the module folder's name. */
  readonly moduleRoot?: {
    readonly files?: readonly string[];
    readonly dirs?: readonly string[];
  };
  readonly roles?: readonly string[];
  /** Require `role/<concept>/file`, never `role/file`. */
  readonly conceptFolders?: boolean;
  /** The most folders allowed between a role folder and a file, not counting `__tests__/`. */
  readonly maxConceptDepth?: number;
}
