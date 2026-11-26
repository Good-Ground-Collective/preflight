import { ESLint } from 'eslint';
import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../../src/index.js';

const configs = plugin.configs as Record<string, Linter.Config[]>;

const lint = async (
  config: string,
  code: string,
): Promise<Linter.LintMessage[]> => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: configs[config] as Linter.Config[],
  });
  const [result] = await eslint.lintText(code, { filePath: 'src/sample.ts' });
  return result?.messages ?? [];
};

describe('unused disable directives', () => {
  it.each(['go-no-go', 'recommended'])(
    'are errors in %s',
    async (config) => {
      const messages = await lint(
        config,
        '// eslint-disable-next-line no-console -- nothing to suppress\nexport const value = 1;\n',
      );
      expect(messages).toContainEqual(
        expect.objectContaining({ severity: 2, ruleId: null }),
      );
    },
  );
});

describe('recommended size and directive rules', () => {
  it('requires a description on disable directives', async () => {
    const messages = await lint(
      'recommended',
      '// eslint-disable-next-line import-x/no-default-export\nexport default 1;\n',
    );
    expect(messages.map((message) => message.ruleId)).toContain(
      '@eslint-community/eslint-comments/require-description',
    );
  });

  it('caps file length at 300 lines', async () => {
    const code = Array.from(
      { length: 301 },
      (_, index) => `export const value${index} = ${index};`,
    ).join('\n');
    const messages = await lint('recommended', `${code}\n`);
    expect(messages.map((message) => message.ruleId)).toContain('max-lines');
  });

  it('caps function length at 60 lines', async () => {
    const body = Array.from(
      { length: 60 },
      (_, index) => `    const value${index} = ${index};`,
    ).join('\n');
    const messages = await lint(
      'recommended',
      `export class Service {\n  run(): void {\n${body}\n  }\n}\n`,
    );
    expect(messages.map((message) => message.ruleId)).toContain(
      'max-lines-per-function',
    );
  });
});
