import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { PYODIDE_VERSION } from './config.ts';

const root = join(import.meta.dirname, '../..');

it('uses the Pyodide version installed for types', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'node_modules/pyodide/package.json'), 'utf8'));
  expect(pkg.version).toBe(PYODIDE_VERSION);
});

it('pins in CI the sympy version that this Pyodide release bundles (1.14.0 for 314.x)', () => {
  expect(readFileSync(join(root, 'python/requirements.txt'), 'utf8')).toMatch(/^sympy==1\.14\.0$/m);
});
