import { describe, expect, it } from 'vitest';
import type { Scene } from '../content/schema.ts';
import { applySceneProgress, emptyProgress, templateUnlocked, topicOpen } from './progress.ts';
import { advance, choose, normalize, view } from './vn.ts';

const scene: Scene = {
  id: 'sc', character: 'h', background: 'bg', unlocks: [],
  nodes: {
    start: [{ speaker: 'h', text: 'one' }, { choice: { question: 'q', options: [{ text: 'a', goto: 'wrong' }, { text: 'b', goto: 'right' }] } }],
    wrong: [{ narration: 'hmm' }, { goto: 'right' }],
    right: [{ speaker: 'h', text: 'done' }],
  },
};

describe('vn', () => {
  it('walks lines, choices and gotos to the end', () => {
    let p = normalize(scene, { node: 'start', index: 0 });
    expect(view(scene, p)).toMatchObject({ kind: 'line' });
    p = advance(scene, p);
    expect(view(scene, p).kind).toBe('choice');
    p = choose(scene, 'wrong');
    expect(view(scene, p)).toEqual({ kind: 'narration', text: 'hmm' });
    p = advance(scene, p);
    expect(p).toEqual({ node: 'right', index: 0 });
    p = advance(scene, p);
    expect(view(scene, p).kind).toBe('end');
  });
});

describe('progress', () => {
  const c = {
    topics: {
      's.a': { fullId: 's.a', requires: [], main_scenes: ['s.a.x', 's.a.y'] },
      's.b': { fullId: 's.b', requires: ['s.a'], main_scenes: [] },
    },
    scenes: { 's.a.x': { topic: 's.a', unlocks: ['s.a.p'] }, 's.a.y': { topic: 's.a', unlocks: [] } },
  } as any;

  it('completes a topic after all main scenes and opens dependants', () => {
    let p = applySceneProgress(c, emptyProgress, 's.a.x', 'start', false);
    expect(templateUnlocked(c, p, 's.a.p')).toBe(false);
    p = applySceneProgress(c, p, 's.a.x', 'end', true);
    expect(templateUnlocked(c, p, 's.a.p')).toBe(true);
    expect(topicOpen(c, p, 's.b')).toBe(false);
    p = applySceneProgress(c, p, 's.a.y', 'end', true);
    expect(p.topics['s.a']).toBe('completed');
    expect(topicOpen(c, p, 's.b')).toBe(true);
    p = applySceneProgress(c, p, 's.a.x', 'start', false);
    expect(p.scenes['s.a.x']!.status).toBe('completed');
  });
});
