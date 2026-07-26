# @good-ground-collective/preflight

ESLint plugin enforcing the coding charter — nit-level review feedback, caught before the PR.

Flat-config only (ESLint 9+). Every rule is a pure AST check, so no type-aware setup (`parserOptions.project`) is required.

## Install

The package is published to **GitHub Packages**, which requires auth to install even though it's public. See [Registry auth](#registry-auth) below to set that up first, then:

```sh
npm i -D @good-ground-collective/preflight \
  eslint \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  eslint-plugin-unicorn eslint-plugin-import-x \
  typescript
```

The extra packages are peer dependencies the shared configs wire in. (`eslint-plugin-import-x` is only used by the `recommended` config — skip it if you only use `go-no-go`.)

## Quickstart

The plugin ships two ready-made flat configs, both arrays you spread into your config:

| Config | What it is |
| --- | --- |
| `go-no-go` | The blocking gate. Every rule is an `error` and the set is kept free of false-positive-prone rules — safe to fail a build on. |
| `recommended` | A superset of `go-no-go` plus the fuzzier, nice-to-have rules. |

### New config (only these rules)

Create `eslint.config.js` (or `.ts`) with nothing but the shared config:

```js
import preflight from '@good-ground-collective/preflight';

export default [
  ...preflight.configs.recommended, // or: preflight.configs['go-no-go']
];
```

That's it — the config already scopes itself to `**/*.ts` / `**/*.tsx`, registers the plugin, and sets the TypeScript parser.

### Existing config

Spread a shared config into your array. Put it after your own blocks so its rules win where they overlap:

```js
import preflight from '@good-ground-collective/preflight';

export default [
  // ...your existing config...
  ...preflight.configs.recommended,
];
```

Prefer to cherry-pick? Register the plugin and enable only the rules you want:

```js
import preflight from '@good-ground-collective/preflight';

export default [
  // ...your existing config...
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { preflight },
    rules: {
      'preflight/no-throw-helpers': 'error',
      'preflight/no-planning-identifiers': 'error',
    },
  },
];
```

Rule docs live in [`docs/rules`](./docs/rules).

## Registry auth

GitHub Packages requires a token to install. Add these two lines to `.npmrc` — both are safe to commit, since `${GITHUB_TOKEN}` is an env-var reference that npm expands at read time, not your actual token:

```
@good-ground-collective:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then provide the token via your environment:

```sh
export GITHUB_TOKEN=<a classic PAT with the read:packages scope>
```

In GitHub Actions, no PAT is needed — set `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on your install step and give the job `permissions: packages: read`.

## License

MIT
