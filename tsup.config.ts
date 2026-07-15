import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  // tsup's dts worker injects `baseUrl`, deprecated in TS 6 (TS5101); silence only that, only for dts.
  dts: {
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  clean: true,
  shims: true,
});
