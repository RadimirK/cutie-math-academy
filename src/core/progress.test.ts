import { describe, expect, it } from 'vitest';
import { loadContent } from '../content/load.ts';
import { affectionTargets, emptyProgress, sceneOpen, scenesOpenedBy } from './progress.ts';

const scene = (id: string, who = 'guide') => `id: ${id}\ncharacter: ${who}\nbackground: bg\nnodes:\n  start:\n    - speaker: ${who}\n      text: hi\n`;
const { content } = loadContent({
  'economy.yaml':
    'pull_cost: 1\nreward_by_difficulty: {1: 1, 2: 1, 3: 1, 4: 1, 5: 1}\ndecay: []\ndaily_cap: {max_difficulty: 1, amount: 1}\npity: {five_star: 1, four_star: 1}\nduplicates: {max_constellation: 6, refund: {3: 1, 4: 1, 5: 1}}\nstarting_currency: 0\n',
  'subjects/s/subject.yaml': 'id: s\ntitle: S\n',
  'subjects/s/topics/a/topic.yaml': 'id: a\ntitle: A\nmain_character: guide\nmain_scenes: [intro]\n',
  'subjects/s/topics/a/scenes/intro.yaml': `${scene('intro')}unlocks: [p]\n`,
  'subjects/s/topics/a/scenes/date.yaml': scene('date', 'fan'),
  'subjects/s/topics/a/problems/p.yaml': "id: p\ndifficulty: 2\nanswer_type: number\nstatement: 'x'\nanswer: '1'\n",
  'subjects/s/topics/b/topic.yaml': 'id: b\ntitle: B\nrequires: [a]\nmain_character: guide\nmain_scenes: [later]\n',
  'subjects/s/topics/b/scenes/later.yaml': scene('later'),
  'subjects/t/subject.yaml': 'id: t\ntitle: T\n',
  'characters/guide.yaml': 'id: guide\nname: G\nrarity: 5\nsubject: s\ntopics: [b]\n',
  'characters/fan.yaml': 'id: fan\nname: F\nrarity: 3\nsubject: s\naffection_scenes:\n  - { threshold: 4, scene: a.date }\n  - { threshold: 9, scene: b.later }\n',
  'characters/other.yaml': 'id: other\nname: O\nrarity: 3\nsubject: t\n',
  'art/props/wall.yaml': 'id: wall\ndesc: wall\nmaterial: wall\nshapes:\n  - poly: [[0, 0], [640, 0], [640, 360]]\n',
  'backgrounds/bg.yaml': 'id: bg\nname: BG\nprops:\n  - { prop: wall, at: [0, 0] }\n',
});

describe('affection', () => {
  it('grows for heroines of the topic, and for heroines of the whole subject', () => {
    expect(affectionTargets(content, 's.a.p')).toEqual(['fan']);
  });

  it('opens an affection scene at its threshold, for an owned heroine only', () => {
    expect(sceneOpen(content, emptyProgress, {}, 's.a.intro')).toBe(true);
    expect(sceneOpen(content, emptyProgress, {}, 's.a.date')).toBe(false);
    expect(sceneOpen(content, emptyProgress, { fan: { affection: 3 } }, 's.a.date')).toBe(false);
    expect(sceneOpen(content, emptyProgress, { fan: { affection: 4 } }, 's.a.date')).toBe(true);
  });

  it('lists the scenes a gain opens', () => {
    expect(scenesOpenedBy(content, 'fan', 2, 4)).toEqual(['s.a.date']);
    expect(scenesOpenedBy(content, 'fan', 4, 6)).toEqual([]);
    expect(scenesOpenedBy(content, 'fan', 3, 12)).toEqual(['s.a.date', 's.b.later']);
  });
});
