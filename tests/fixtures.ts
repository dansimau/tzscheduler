import { test as base, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const COVERAGE_DIR = path.join(__dirname, '..', '.v8-coverage');

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });

    await use(page);

    const coverage = await page.coverage.stopJSCoverage();
    fs.mkdirSync(COVERAGE_DIR, { recursive: true });
    const id = `${testInfo.workerIndex}-${testInfo.testId.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}`;
    fs.writeFileSync(
      path.join(COVERAGE_DIR, `${id}.json`),
      JSON.stringify(coverage),
    );
  },
});

export { expect };
