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

/** Affection per owned character (only owned characters are listed). */
export type Affection = Record<string, { affection: number }>;

/**
 * Whether the scene can be played: its topic is open and, for an affection scene, the
 * heroine is owned with enough affection (mirrors complete_scene).
 */
export function sceneOpen(c: Content, p: Progress, owned: Affection, sceneId: string): boolean {
  const s = c.scenes[sceneId];
  if (!s || !topicOpen(c, p, s.topic)) return false;
  return !s.affection || (owned[s.affection.character]?.affection ?? -1) >= s.affection.threshold;
}

/**
 * Characters whose affection grows when the template is solved (mirrors submit_solution):
 * those bound to its topic, and those bound to no topic in particular but to its subject.
 */
export function affectionTargets(c: Content, templateId: string): string[] {
  const t = c.templates[templateId];
  const topic = t && c.topics[t.topic];
  if (!topic) return [];
  return Object.values(c.characters)
    .filter((ch) => ch.topics.includes(topic.fullId) || (ch.topics.length === 0 && ch.subject === topic.subject))
    .map((ch) => ch.id);
}

/** Affection scenes of the character that open when her affection goes from `before` to `after`. */
export function scenesOpenedBy(c: Content, characterId: string, before: number, after: number): string[] {
  return (c.characters[characterId]?.affection_scenes ?? []).filter((a) => before < a.threshold && a.threshold <= after).map((a) => a.scene);
}
