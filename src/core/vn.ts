// Scene playback state machine, independent of rendering.
import type { Scene, SceneStep } from '../content/schema.ts';

export interface VnPosition {
  node: string;
  index: number;
}

export type VnView =
  | { kind: 'line'; step: Extract<SceneStep, { text: string }> }
  | { kind: 'narration'; text: string }
  | { kind: 'choice'; question: string; options: { text: string; goto: string }[] }
  | { kind: 'end' };

export function view(scene: Scene, pos: VnPosition): VnView {
  const step = scene.nodes[pos.node]?.[pos.index];
  if (!step) return { kind: 'end' };
  if ('text' in step) return { kind: 'line', step };
  if ('narration' in step) return { kind: 'narration', text: step.narration };
  if ('choice' in step) return { kind: 'choice', ...step.choice };
  return view(scene, { node: step.goto, index: 0 }); // goto steps are transparent
}

/** Position of the step that view() shows, with gotos followed. */
export function normalize(scene: Scene, pos: VnPosition): VnPosition {
  for (let guard = 0; guard < 1000; guard++) {
    const step = scene.nodes[pos.node]?.[pos.index];
    if (!step || !('goto' in step)) return pos;
    pos = { node: step.goto, index: 0 };
  }
  throw new Error('goto cycle');
}

export function advance(scene: Scene, pos: VnPosition): VnPosition {
  const p = normalize(scene, pos);
  return normalize(scene, { node: p.node, index: p.index + 1 });
}

export function choose(scene: Scene, goto: string): VnPosition {
  return normalize(scene, { node: goto, index: 0 });
}
