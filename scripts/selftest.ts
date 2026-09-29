// CI step: self-test of every problem template (invariant 5).
// For 20 fixed seeds: the instance generates, its statement renders with KaTeX, its config
// fits the answer type, the reference answer is accepted by its own checker and a mutated
// answer is rejected. Scene texts are also render-checked here.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import katex from 'katex';
import { answerTypes } from '../src/answer-types/core.ts';
import { instantiateDeclarative, type ProblemInstance } from '../src/core/generate.ts';
import { splitMath } from '../src/core/mathText.ts';
import { loadOrDie } from './content-files.ts';

export const SELFTEST_SEEDS = Array.from({ length: 20 }, (_, i) => ((i + 1) * 2654435761) % 2147483648);

const ROOT = join(import.meta.dirname, '..');
const content = loadOrDie();
const failures: string[] = [];
const fail = (where: string, msg: string) => failures.push(`✗ ${where}: ${msg}`);

function renderCheck(where: string, text: string) {
  const segs = splitMath(text);
  for (const s of segs) {
    if (s.kind === 'text') {
      if (s.value.includes('$')) fail(where, 'непарный $');
      continue;
    }
    try {
      katex.renderToString(s.value, { throwOnError: true, displayMode: s.kind === 'display', strict: 'ignore' });
    } catch (e) {
      fail(where, `KaTeX: ${(e as Error).message.split('\n')[0]}`);
    }
  }
}

function runPython(request: unknown): any {
  const python = process.env.PYTHON ?? (existsSync(join(ROOT, '.venv/bin/python')) ? join(ROOT, '.venv/bin/python') : 'python3');
  const r = spawnSync(python, ['-m', 'cutemath.selftest'], {
    input: JSON.stringify(request),
    env: { ...process.env, PYTHONPATH: join(ROOT, 'python') },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.error);
    process.exit(1);
  }
  return JSON.parse(r.stdout);
}

// ---- scenes ----
for (const scene of Object.values(content.scenes))
  for (const [node, steps] of Object.entries(scene.nodes))
    steps.forEach((step, i) => {
      const where = `${scene.fullId} nodes.${node}[${i}]`;
      if ('text' in step) renderCheck(where, step.text);
      if ('narration' in step) renderCheck(where, step.narration);
      if ('choice' in step) {
        renderCheck(where, step.choice.question);
        step.choice.options.forEach((o) => renderCheck(where, o.text));
      }
    });

// ---- generate instances ----
const instances = new Map<string, ProblemInstance>(); // `${template}#${seed}`
const genRequests: { key: string; source: string; seed: number }[] = [];
for (const t of Object.values(content.templates))
  for (const seed of SELFTEST_SEEDS) {
    const key = `${t.fullId}#${seed}`;
    if (t.generator) genRequests.push({ key, source: t.generatorSource!, seed });
    else {
      try {
        instances.set(key, instantiateDeclarative(t, seed));
      } catch (e) {
        fail(key, `генерация: ${(e as Error).message}`);
      }
    }
  }
// Determinism probe: every generator runs twice on its first seed.
const probes = genRequests.filter((g) => g.seed === SELFTEST_SEEDS[0]).map((g) => ({ ...g, key: `${g.key}#again` }));
const generated = runPython({ generate: [...genRequests, ...probes] }).generated as Record<string, any>;
for (const g of genRequests) {
  const r = generated[g.key];
  if (r.error) fail(g.key, `генератор: ${r.error}${r.trace ? `\n${r.trace}` : ''}`);
  else instances.set(g.key, r);
}
for (const p of probes) {
  const a = generated[p.key.replace(/#again$/, '')];
  if (!a?.error && JSON.stringify(a) !== JSON.stringify(generated[p.key]))
    fail(p.key, 'генератор недетерминирован: один seed дал разные задачи');
}

// ---- check instances ----
const pyChecks: { key: string; type: string; correct: string; config: unknown }[] = [];
for (const t of Object.values(content.templates)) {
  const at = answerTypes[t.answer_type]!;
  const statements = new Set<string>();
  for (const seed of SELFTEST_SEEDS) {
    const key = `${t.fullId}#${seed}`;
    const inst = instances.get(key);
    if (!inst) continue;
    statements.add(inst.statement);
    renderCheck(key, inst.statement);
    const cfg = at.configSchema.safeParse(inst.config);
    if (!cfg.success) {
      fail(key, `config: ${cfg.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      continue;
    }
    const bad = at.validateInstance?.(inst.answer, cfg.data);
    if (bad) fail(key, bad);
    if (at.check === 'python') pyChecks.push({ key, type: at.id, correct: inst.answer, config: cfg.data });
    else {
      const accepts = at.check(inst.answer, inst.answer, cfg.data);
      const wrong = at.mutate!(inst.answer, cfg.data);
      const rejects = at.check(wrong, inst.answer, cfg.data);
      if (!('ok' in accepts && accepts.ok)) fail(key, `эталон «${inst.answer}» не принят: ${JSON.stringify(accepts)}`);
      if (!('ok' in rejects && !rejects.ok)) fail(key, `неверный ответ «${wrong}» не отвергнут: ${JSON.stringify(rejects)}`);
    }
  }
  if (statements.size < 3) console.log(`⚠ ${t.fullId}: всего ${statements.size} различных условий на ${SELFTEST_SEEDS.length} seed`);
}
const checked = runPython({ check: pyChecks }).checked as Record<string, any>;
for (const c of pyChecks) {
  const r = checked[c.key];
  if (r.error) fail(c.key, `проверяющий упал на «${c.correct}»: ${r.error}`);
  else {
    if (!r.accepts.ok) fail(c.key, `эталон «${c.correct}» не принят: ${JSON.stringify(r.accepts)}`);
    if (r.rejects.ok !== false) fail(c.key, `неверный ответ «${r.wrong}» не отвергнут: ${JSON.stringify(r.rejects)}`);
    // The TS fast path, where it answers, must agree with Python.
    const q = answerTypes[c.type]!.quickCheck;
    for (const [user, expected] of [[c.correct, r.accepts], [r.wrong, r.rejects]] as const) {
      const quick = q?.(user, c.correct, c.config);
      if (quick && JSON.stringify(quick) !== JSON.stringify(expected))
        fail(c.key, `quickCheck(«${user}») = ${JSON.stringify(quick)}, а Python: ${JSON.stringify(expected)}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\n${failures.length} провалов самотеста`);
  process.exit(1);
}
console.log(`✓ самотест: ${Object.keys(content.templates).length} шаблонов × ${SELFTEST_SEEDS.length} seed, ${Object.keys(content.scenes).length} сцен`);
