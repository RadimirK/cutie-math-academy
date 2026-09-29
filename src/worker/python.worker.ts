/// <reference lib="webworker" />
// Pyodide + sympy in a Web Worker. Runs template generators and the Python answer checkers
// (python/cutemath, the same code CI runs in CPython). Loaded lazily; see src/lib/python.ts.
import type { PyodideInterface } from 'pyodide';
import { PYODIDE_INDEX_URL } from './config.ts';

const sources = import.meta.glob('/python/cutemath/*.py', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

let handle: ((request: string) => string) | null = null;

async function init() {
  const { loadPyodide } = (await import(/* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`)) as typeof import('pyodide');
  const py: PyodideInterface = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  await py.loadPackage(['sympy']);
  py.FS.mkdirTree('/home/pyodide/cutemath');
  for (const [path, text] of Object.entries(sources)) py.FS.writeFile(`/home/pyodide/cutemath/${path.split('/').pop()}`, text);
  py.runPython('import sys\nif "/home/pyodide" not in sys.path: sys.path.insert(0, "/home/pyodide")');
  const api = py.pyimport('cutemath.api');
  // Warm up sympy's lazy imports so the first real check is fast.
  api.handle(JSON.stringify({ op: 'check', type: 'expression', user: 'x', correct: 'x' }));
  handle = (request) => api.handle(request) as string;
}

const ready = init();

self.onmessage = async (e: MessageEvent<{ id: number; request: Record<string, unknown> }>) => {
  const { id, request } = e.data;
  try {
    await ready;
    const result = request.op === 'init' ? null : JSON.parse(handle!(JSON.stringify(request)));
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Python tracebacks are long; the last line carries the actual error.
    self.postMessage({ id, ok: false, error: message.trim().split('\n').pop() });
  }
};
