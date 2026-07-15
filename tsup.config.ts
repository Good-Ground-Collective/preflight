import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  // tsup's dts worker injects `baseUrl`, which TypeScript 6 flags as
  // deprecated (TS5101); silence only that deprecation, only for dts.
  dts: {
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  clean: true,
  shims: true,
});
