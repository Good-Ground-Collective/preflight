const sourceExtension = /\.[cm]?[jt]sx?$/u;
const testName = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;

/** Classifies file names as source code, tests, or neither. */
export class SourceFileKinds {
  readonly testsFolder = '__tests__';

  isSource(name: string): boolean {
    return sourceExtension.test(name);
  }

  isTest(name: string): boolean {
    return testName.test(name);
  }

  isProductionSource(name: string): boolean {
    return this.isSource(name) && !this.isTest(name);
  }

  withoutExtension(name: string): string {
    return name.replace(sourceExtension, '');
  }
}

export const sourceFileKinds = new SourceFileKinds();
