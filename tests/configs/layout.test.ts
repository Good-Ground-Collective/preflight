import { writeFileSync } from 'node:fs';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../../src/index.js';
import { TempTree } from '../support/temp-tree.js';

const configs = plugin.configs as Record<string, Linter.Config[]>;
const layoutRules = [
  'preflight/module-layout',
  'preflight/test-location',
  'preflight/test-file-naming',
  'preflight/max-directory-entries',
];

describe('layout config', () => {
  it('enables every filesystem rule', () => {
    const rules = Object.assign({}, ...configs['layout']!.map((entry) => entry.rules));
    expect(Object.keys(rules).sort()).toEqual([...layoutRules].sort());
  });

  it('stays out of go-no-go and recommended', () => {
    for (const name of ['go-no-go', 'recommended']) {
      const keys = configs[name]!.flatMap((entry) => Object.keys(entry.rules ?? {}));
      for (const rule of layoutRules) expect(keys).not.toContain(rule);
    }
  });

  it('registers the plugin it belongs to', () => {
    for (const entry of configs['layout']!) {
      expect(entry.plugins?.['preflight']).toBe(plugin);
    }
  });
});

describe('module-layout reads the disk on every lint', () => {
  it('picks up a marker file added after the first run', () => {
    const tree = new TempTree({ files: ['src/audit/services/clock.ts'] });
    const filename = tree.at('src/audit/services/clock.ts');
    const config: Linter.Config[] = [
      ...configs['layout']!,
      {
        rules: {
          'preflight/module-layout': [
            'error',
            { ...plugin.layouts.module, topLevel: { dirs: ['shared'] } },
          ],
        },
      },
    ];
    const linter = new Linter({ cwd: tree.root });
    const lint = () =>
      linter.verify('export {};', config, { filename }).map((message) => message.messageId);

    expect(lint()).toEqual(['topLevelDir']);
    writeFileSync(tree.at('src/audit/audit-module.ts'), '');
    expect(lint()).toEqual(['flatFile']);
  });
});
