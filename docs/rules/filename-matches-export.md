# filename-matches-export

Require every exported class name to end with the PascalCase file name.

## Rule details

A file named for the class it exports can be found from either end: the class
name says which file it lives in, and the file name says what it holds. The
class may put a qualifier in front, because the implementation detail goes
first: `logger-binder.ts` may export `LoggerBinder` or `PinoLoggerBinder`.

The expected suffix is the file's basename without its `.ts`, `.tsx`, `.mts` or
`.cts` extension, split on `-`, `.` and `_` and joined in PascalCase. So
`user.model.ts` expects `UserModel`.

Checked: `export class`, `export default class` with a name, and
`export { Local }` / `export { Local as Name }` of a top-level class (the
exported name is checked). Not checked: re-exports from another module,
`export { X as default }`, class expressions, and interfaces or types.

Exempt files:

- tests (`*.test.*`, `*.spec.*`, and anything under `__tests__/`)
- `index.*` files, which re-export rather than name a concept
- declaration files (`*.d.ts`)
- files matching `groupingFiles`

### Incorrect

```ts
// logger-binder.ts
export class Parser {}
```

### Correct

```ts
// logger-binder.ts
export class PinoLoggerBinder {}
```

## Options

### `groupingFiles`

`string[]`, default `['*-errors.ts', 'errors.ts', 'ids.ts']`.

Globs for files that deliberately export a family of classes, such as an error
hierarchy. A glob without `/` matches the basename; one with `/` matches the
path relative to the working directory. Supports `*`, `**` and `?`. Setting it
replaces the default list.

```json
{ "preflight/filename-matches-export": ["error", { "groupingFiles": ["*-errors.ts", "src/legacy/**"] }] }
```
