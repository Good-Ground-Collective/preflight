import type { ModuleLayoutOptions } from './module-layout-options.js';

const modulePreset: ModuleLayoutOptions = {
  root: 'src',
  module: { marker: '*-module.ts' },
  moduleRoot: {
    files: ['<module>-module.ts', 'urls.ts', 'events.ts', 'permissions.ts', 'errors.ts'],
    dirs: ['contracts', '__tests__'],
  },
  roles: [
    'domain',
    'models',
    'services',
    'definitions',
    'repositories',
    'loaders',
    'savers',
    'transformers',
    'resources',
    'subscribers',
    'exposures',
  ],
  conceptFolders: true,
  maxConceptDepth: 1,
};

const slicePreset: ModuleLayoutOptions = {
  root: 'src',
  module: { match: 'src/*' },
  moduleRoot: {
    files: ['index.ts'],
    dirs: ['__tests__'],
  },
  roles: ['models', 'services', 'definitions'],
  conceptFolders: false,
  maxConceptDepth: 0,
};

/** Ready-made `module-layout` option objects; spread one and override what differs. */
export const layouts = { module: modulePreset, slice: slicePreset } as const;
