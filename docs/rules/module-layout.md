# module-layout

Require files to follow the configured module → role → concept folder layout.

## Rule details

This rule reads the filesystem. It works out which module a file belongs to
by looking at the folders above it, then checks that the file sits where the
layout allows. It reports once per file, at line 1, and states the expected
path so the fix is obvious.

A **module** is a folder that the `module` setting recognizes. Inside a
module, files sit in role folders (`services/`, `models/`, …), one folder per
concept, nested to a fixed depth. A folder inside a module that is itself
recognized as a module is a submodule and follows the same layout from its own
root.

- **Outside any module**, only `topLevel.dirs` and `topLevel.files` may sit
  directly in `root`.
- **At a module root**, only `moduleRoot.files`, `moduleRoot.dirs`, `roles`
  and submodules may appear.
- **Inside a role**, `conceptFolders: true` requires `role/<concept>/<file>`,
  and `maxConceptDepth` caps the folders between the role and the file.
  `__tests__/` and anything below it does not count toward the depth.

Each check runs only when its setting is present. With no options the rule
reports nothing, so it is safe in the `layout` config until a repo configures
it.

The rule reads directories fresh for every file, so adding or removing a
marker file is picked up in a running editor session.

### Incorrect

With the `module` preset:

```text
src/audit/module.ts
src/audit/schedule-builder.ts            ✗ Expected <role>/<concept>/schedule-builder.ts
src/audit/services/schedule-builder.ts   ✗ Expected services/<concept>/schedule-builder.ts
src/audit/services/schedule/parts/x.ts   ✗ Expected services/schedule/x.ts
src/audit/helpers/format.ts              ✗ 'helpers/' is not a role or module folder
```

### Correct

```text
src/audit/module.ts
src/audit/errors.ts
src/audit/__tests__/audit-flow.integration.test.ts
src/audit/services/schedule/schedule-builder.ts
src/audit/services/schedule/__tests__/schedule-builder.test.ts
src/audit/scheduling/module.ts                 (a submodule)
src/audit/scheduling/models/slot/slot.ts
```

## Options

```js
'preflight/module-layout': ['error', {
  root: 'src',
  topLevel: {
    dirs: ['packages', 'config', 'db'],
    files: ['index.ts', 'server.ts'],
  },
  module: {
    marker: 'module.ts',
    // or: match: 'src/packages/*/*'
  },
  moduleRoot: {
    files: ['module.ts', 'errors.ts'],
    dirs: ['contracts', '__tests__'],
  },
  roles: ['domain', 'models', 'services', 'definitions', 'repositories', 'loaders',
          'savers', 'transformers', 'resources', 'subscribers', 'exposures'],
  conceptFolders: true,
  maxConceptDepth: 1,
}]
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `root` | `string` | package root | The folder, relative to the nearest `package.json`, that the rule governs. Files outside it are not checked. |
| `topLevel.dirs` / `topLevel.files` | `string[]` | not checked | Globs for what may sit directly in `root` outside a module. |
| `module.marker` | `string` | — (`module.ts` in the `module` preset) | A module is a folder holding a file whose name matches this glob. |
| `module.match` | `string` | — | A module is a folder whose path, relative to the package root, matches this glob. |
| `moduleRoot.files` | `string[]` | not checked | Globs for files allowed directly in a module. `<module>` stands for the module folder's name. The marker glob is always allowed. |
| `moduleRoot.dirs` | `string[]` | — | Non-role folders allowed directly in a module. The folder check runs when this or `roles` is set. |
| `roles` | `string[]` | — | Role folder names. |
| `conceptFolders` | `boolean` | `false` | Require a concept folder between the role and the file. |
| `maxConceptDepth` | `integer` | not checked | The most folders allowed between a role folder and a file. |

Globs support `*` and `?` within one path segment and `**` across segments.

### Presets

The plugin exports two option objects on `preflight.layouts`:

- `layouts.module` is the full layout shown above: `root: 'src'`, modules
  marked by a file named exactly `module.ts`. A module root may hold
  `module.ts`, `errors.ts`, `contracts/`, `__tests__/`, role folders and
  submodules. Concept folders are one level deep. Override `module.marker`
  or `module.match` to recognize modules differently.
- `layouts.slice` is the lighter layout: every folder directly in `src/` is a
  slice (`module: { match: 'src/*' }`) holding `models/`, `services/` and
  `definitions/` with files directly inside them, plus `index.ts` and
  `__tests__/`.

Use one as-is, or spread it and override what differs:

```js
import preflight from '@good-ground-collective/preflight';

export default [
  ...preflight.configs.layout,
  {
    rules: {
      'preflight/module-layout': ['error', {
        ...preflight.layouts.module,
        topLevel: { dirs: ['packages', 'config'], files: ['index.ts'] },
      }],
    },
  },
];
```

A framework with its own conventions can export a preset that extends one of
these and adds its own module-root files.

## When not to use it

Config files and scripts that sit outside `root` are not checked. If a repo has
no stable module convention yet, leave the rule unconfigured.
