// Client-side mirror of the server's unlock rules (internal.topic_open, internal.template_unlocked),
// used only for display. The server re-checks everything.
import type { Content } from '../content/load.ts';

export type SceneStatus = 'in_progress' | 'completed';
export interface Progress {
  scenes: Record<string, { node: string; status: SceneStatus }>;
  topics: Record<string, SceneStatus>;
}

export const emptyProgress: Progress = { scenes: {}, topics: {} };

export function topicOpen(c: Content, p: Progress, topicId: string): boolean {
  const t = c.topics[topicId];
  return !!t && t.requires.every((r) => p.topics[r] === 'completed');
}

export function templateUnlocked(c: Content, p: Progress, templateId: string): boolean {
  return Object.entries(p.scenes).some(
    ([sceneId, s]) => s.status === 'completed' && c.scenes[sceneId]?.unlocks.includes(templateId),
  );
}

export function topicStatus(c: Content, p: Progress, topicId: string): 'locked' | 'new' | 'in_progress' | 'completed' {
  if (!topicOpen(c, p, topicId)) return 'locked';
  return p.topics[topicId] ?? 'new';
}

/** Applies a complete_scene call locally (demo mode and optimistic updates). */
export function applySceneProgress(c: Content, p: Progress, sceneId: string, node: string, finished: boolean): Progress {
  const scene = c.scenes[sceneId]!;
  const prev = p.scenes[sceneId];
  const status: SceneStatus = prev?.status === 'completed' || finished ? 'completed' : 'in_progress';
  const scenes = { ...p.scenes, [sceneId]: { node, status } };
  const topic = c.topics[scene.topic]!;
  const done = topic.main_scenes.every((s) => scenes[s]?.status === 'completed');
  const topics = { ...p.topics, [topic.fullId]: p.topics[topic.fullId] === 'completed' || done ? 'completed' as const : 'in_progress' as const };
  return { scenes, topics };
}
