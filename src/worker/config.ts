// Must match the `pyodide` devDependency (types) and python/requirements.txt (sympy version
// bundled with this Pyodide release); src/worker/config.test.ts checks both.
export const PYODIDE_VERSION = '314.0.7';
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
