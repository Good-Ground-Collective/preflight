import { ESLint } from 'eslint';
import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../../src/index.js';

const configs = plugin.configs as Record<string, Linter.Config[]>;

/**
 * Lints a single file path through the real go-no-go config and returns only
 * the `unicorn/filename-case` messages. The file body is deliberately inert so
 * nothing but the path under test can produce a hit.
 */
const filenameMessages = async (filePath: string): Promise<string[]> => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: configs['go-no-go'] as Linter.Config[],
  });
  const [result] = await eslint.lintText('export const value = 1;\n', {
    filePath,
  });
  return (result?.messages ?? [])
    .filter((message) => message.ruleId === 'unicorn/filename-case')
    .map((message) => message.message);
};

describe('tooling-owned directories are exempt', () => {
  it.each([
    'src/cli/__tests__/cli.test.ts',
    'src/shared/__mocks__/fs.ts',
    'src/shared/__snapshots__/config.ts',
    'src/shared/__fixtures__/payloads.ts',
  ])('accepts %s', async (filePath) => {
    expect(await filenameMessages(filePath)).toEqual([]);
  });

  // `ignore` short-circuits the whole rule when any path segment matches, so
  // the exemption covers the subtree rather than just the directory name.
  // unicorn offers no narrower option; this pins the consequence so it is a
  // known trade-off rather than a surprise.
  it('exempts file names inside an ignored directory too', async () => {
    expect(await filenameMessages('src/__tests__/MyThing.ts')).toEqual([]);
  });

  it('does not leak the exemption to sibling directories', async () => {
    expect(await filenameMessages('src/Tests/MyThing.ts')).toEqual([
      expect.stringContaining('Directory name `Tests`'),
    ]);
  });
});

describe('.ts files stay kebab-case only', () => {
  it('accepts a kebab-case path', async () => {
    expect(await filenameMessages('src/tasks/body-sections.ts')).toEqual([]);
  });

  it.each(['src/tasks/MyFile.ts', 'src/tasks/my_file.ts'])(
    'rejects %s',
    async (filePath) => {
      expect(await filenameMessages(filePath)).toHaveLength(1);
    },
  );

  it('still rejects a non-kebab directory that is not tooling-owned', async () => {
    expect(await filenameMessages('src/BadDir/thing.ts')).toEqual([
      expect.stringContaining('Directory name `BadDir`'),
    ]);
  });
});

describe('component files accept kebab-case or PascalCase', () => {
  it.each([
    'src/components/UserCard.tsx',
    'src/components/user-card.tsx',
    'src/components/user-card.test.tsx',
    'src/components/UserCard.stories.tsx',
    'src/components/UserCard.jsx',
    'src/components/user-card.jsx',
    'src/components/__tests__/UserCard.tsx',
  ])('accepts %s', async (filePath) => {
    expect(await filenameMessages(filePath)).toEqual([]);
  });

  it.each(['src/components/user_card.tsx', 'src/components/user_card.jsx'])(
    'still rejects %s — the allowance is kebab or Pascal, not anything',
    async (filePath) => {
      expect(await filenameMessages(filePath)).toEqual([
        expect.stringContaining('not in kebab case or pascal case'),
      ]);
    },
  );
});

describe('JSX bodies parse', () => {
  // Claiming `**/*.jsx` pulls those files into linting for the first time, so
  // the block needs a JSX-capable parser or every real component is a parse
  // error rather than a naming hit.
  it.each(['src/components/UserCard.tsx', 'src/components/UserCard.jsx'])(
    'reports no parse error for %s',
    async (filePath) => {
      const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: configs['go-no-go'] as Linter.Config[],
      });
      const [result] = await eslint.lintText(
        'export const UserCard = () => <div className="card">hi</div>;\n',
        { filePath },
      );
      const fatal = (result?.messages ?? []).filter(
        (message) => message.fatal === true,
      );
      expect(fatal).toEqual([]);
    },
  );
});
