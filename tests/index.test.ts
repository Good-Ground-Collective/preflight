import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import plugin from '../src/index.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { name: string; version: string };

describe('plugin object', () => {
  it('exposes meta read from package.json', () => {
    expect(plugin.meta).toEqual({
      name: 'eslint-plugin-preflight',
      version: pkg.version,
      namespace: 'preflight',
    });
  });

  it('exposes a rules map', () => {
    expect(plugin.rules).toBeTypeOf('object');
  });

  it('exposes go-no-go and recommended flat configs', () => {
    const configs = plugin.configs as Record<string, unknown>;
    expect(Array.isArray(configs['go-no-go'])).toBe(true);
    expect(Array.isArray(configs['recommended'])).toBe(true);
  });

  it('registers itself under the preflight plugin key in both configs', () => {
    const configs = plugin.configs as Record<
      string,
      { plugins?: Record<string, unknown> }[]
    >;
    for (const name of ['go-no-go', 'recommended']) {
      const withPlugins = configs[name]!.filter((entry) => entry.plugins);
      expect(withPlugins.length).toBeGreaterThan(0);
      for (const entry of withPlugins) {
        expect(entry.plugins!['preflight']).toBe(plugin);
      }
    }
  });

  it('recommended starts with every go-no-go entry (structural superset)', () => {
    const configs = plugin.configs as Record<string, unknown[]>;
    const goNoGo = configs['go-no-go']!;
    const recommended = configs['recommended']!;
    expect(recommended.length).toBeGreaterThanOrEqual(goNoGo.length);
    for (const [index, entry] of goNoGo.entries()) {
      expect(recommended[index]).toBe(entry);
    }
  });
});
