// Main-thread client of the Pyodide worker: lazy start, request/response, timeouts.
// A request that times out kills the worker (Python cannot be interrupted); the next
// request starts a fresh one.
import type { CheckResult } from '../answer-types/core.ts';
import type { ProblemInstance } from '../core/generate.ts';

export type PythonStatus = 'idle' | 'loading' | 'ready' | 'error';
export class PythonTimeout extends Error {}

const INIT_TIMEOUT_MS = 120_000;

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, { resolve(v: unknown): void; reject(e: Error): void; timer: ReturnType<typeof setTimeout> }>();

let status: PythonStatus = 'idle';
const listeners = new Set<(s: PythonStatus) => void>();
function setStatus(s: PythonStatus) {
  status = s;
  listeners.forEach((l) => l(s));
}
export const pythonStatus = () => status;
export function onPythonStatus(l: (s: PythonStatus) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function kill(reason: Error) {
  worker?.terminate();
  worker = null;
  ready = null;
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(reason);
  }
  pending.clear();
  setStatus('idle');
}

function send(request: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
  if (!worker) {
    worker = new Worker(new URL('../worker/python.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      clearTimeout(p.timer);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      kill(new Error(`воркер упал: ${e.message}`));
      setStatus('error');
    };
  }
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => kill(new PythonTimeout(`Python не ответил за ${timeoutMs / 1000} с`)), timeoutMs);
    pending.set(id, { resolve, reject, timer });
    worker!.postMessage({ id, request });
  });
}

/** Starts loading Pyodide + sympy in the background (idempotent). */
export function preloadPython(): Promise<void> {
  if (!ready) {
    setStatus('loading');
    ready = send({ op: 'init' }, INIT_TIMEOUT_MS).then(
      () => setStatus('ready'),
      (e: Error) => {
        setStatus('error');
        ready = null;
        throw e;
      },
    );
  }
  return ready;
}

async function call(request: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
  await preloadPython();
  return send(request, timeoutMs);
}

export async function generateWithPython(source: string, seed: number, name: string): Promise<ProblemInstance> {
  return (await call({ op: 'generate', source, seed, name }, 15_000)) as ProblemInstance;
}

type PyCheck = CheckResult & { needsSymbolic?: boolean };

export async function checkWithPython(type: string, user: string, correct: string, config: unknown): Promise<CheckResult> {
  const req = { op: 'check', type, user, correct, config };
  if (type !== 'expression') return (await call({ ...req, stage: 'full' }, 15_000)) as CheckResult;
  const numeric = (await call({ ...req, stage: 'numeric' }, 15_000)) as PyCheck;
  if (!numeric.needsSymbolic) return numeric;
  // Too few valid sample points: only simplify() can decide, and it gets 3 seconds.
  try {
    return (await call({ ...req, stage: 'symbolic' }, 3_000)) as CheckResult;
  } catch (e) {
    if (e instanceof PythonTimeout) return { ok: false };
    throw e;
  }
}
