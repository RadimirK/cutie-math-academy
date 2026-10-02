import { describe, expect, it } from 'vitest';
import { loadContent, promptProfile, resolveRef } from './load.ts';

const economy = `pull_cost: 160
reward_by_difficulty: {1: 80, 2: 160, 3: 400, 4: 800, 5: 1600}
decay: []
daily_cap: {max_difficulty: 2, amount: 1600}
pity: {five_star: 70, four_star: 10}
duplicates: {max_constellation: 6, refund: {3: 1, 4: 2, 5: 3}}
starting_currency: 0
`;

function base(): Record<string, string> {
  return {
    'economy.yaml': economy,
    'subjects/s/subject.yaml': 'id: s\ntitle: S\n',
    'subjects/s/topics/a/topic.yaml': 'id: a\ntitle: A\nmain_character: hero\nmain_scenes: [intro]\n',
    'subjects/s/topics/a/scenes/intro.yaml':
      'id: intro\ncharacter: hero\nbackground: bg\nnodes:\n  start:\n    - speaker: hero\n      text: hi\nunlocks: [p1]\n',
    'subjects/s/topics/a/problems/p1.yaml': "id: p1\ndifficulty: 1\nanswer_type: number\nstatement: 'x'\nanswer: '1'\n",
    'characters/hero.yaml': 'id: hero\nname: H\nrarity: 5\nsubject: s\n',
    'art/props/wall.yaml': 'id: wall\ndesc: wall\nmaterial: wall\nshapes:\n  - poly: [[0, 0], [640, 0], [640, 360]]\n',
    'backgrounds/bg.yaml': 'id: bg\nname: BG\nprops:\n  - { prop: wall, at: [0, 0] }\n',
  };
}

const errors = (files: Record<string, string>) =>
  loadContent(files).issues.filter((i) => i.level === 'error').map((i) => `${i.file}: ${i.message}`);

describe('loadContent', () => {
  it('accepts valid content and builds full ids', () => {
    const { content, issues } = loadContent(base());
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(content.topics['s.a']!.templates).toEqual(['s.a.p1']);
    expect(content.scenes['s.a.intro']!.unlocks).toEqual(['s.a.p1']);
  });

  it('builds a background variant on its base', () => {
    const f = base();
    f['backgrounds/bg.yaml'] = "id: bg\nname: BG\npalette: { wall: '#111111', floor: '#222222' }\nprops:\n  - { prop: wall, at: [0, 0] }\n";
    f['backgrounds/bg_night.yaml'] = "id: bg_night\nname: N\nbase: bg\npalette: { wall: '#333333' }\nprops:\n  - { prop: wall, at: [5, 5] }\n";
    const { content, issues } = loadContent(f);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(content.backgrounds.bg_night!.palette).toEqual({ wall: '#333333', floor: '#222222' });
    expect(content.backgrounds.bg_night!.props.map((p) => p.at)).toEqual([[0, 0], [5, 5]]);
    f['backgrounds/bg_night.yaml'] = 'id: bg_night\nname: N\nbase: bg\nset: { door: { w: 1 } }\n';
    expect(errors(f).join('\n')).toContain('set: в фоне bg нет предмета door');
    f['backgrounds/bg.yaml'] = 'id: bg\nname: BG\nbase: bg_night\n';
    expect(errors(f).join('\n')).toContain('base: цикл');
  });

  it('reports broken references', () => {
    const f = base();
    f['subjects/s/topics/a/scenes/intro.yaml'] =
      'id: intro\ncharacter: ghost\nbackground: void\nnodes:\n  start:\n    - goto: nowhere\nunlocks: [p9]\n';
    const e = errors(f).join('\n');
    expect(e).toContain('character: нет персонажа ghost');
    expect(e).toContain('background: нет фона void');
    expect(e).toContain('goto на несуществующий узел nowhere');
    expect(e).toContain('unlocks: нет шаблона s.a.p9');
  });

  it('reports requires cycles', () => {
    const f = base();
    f['subjects/s/topics/a/topic.yaml'] = 'id: a\ntitle: A\nrequires: [b]\nmain_character: hero\nmain_scenes: [intro]\n';
    f['subjects/s/topics/b/topic.yaml'] = 'id: b\ntitle: B\nrequires: [a]\nmain_character: hero\nmain_scenes: [intro]\n';
    expect(errors(f).join('\n')).toContain('цикл в requires');
  });

  it('reports schema errors, unknown answer types, undeclared params and misplaced files', () => {
    const f = base();
    f['subjects/s/topics/a/problems/p1.yaml'] = "id: p1\ndifficulty: 9\nanswer_type: telepathy\nstatement: '<<q>>'\nanswer: '1'\n";
    f['subjects/s/stray.yaml'] = 'x: 1';
    const e = errors(f).join('\n');
    expect(e).toContain('difficulty');
    expect(errors({ ...base(), 'subjects/s/topics/a/problems/p1.yaml': "id: p1\ndifficulty: 1\nanswer_type: telepathy\nstatement: '<<q>>'\nanswer: '1'\n" }).join('\n'))
      .toMatch(/неизвестный тип telepathy[\s\S]*<<q>>: параметр не объявлен/);
    expect(e).toContain('subjects/s/stray.yaml: файл лежит не на своём месте');
  });

  it('gates affection scenes and rejects gating a main scene', () => {
    const f = base();
    f['subjects/s/topics/a/scenes/date.yaml'] = 'id: date\ncharacter: hero\nbackground: bg\nnodes:\n  start:\n    - speaker: hero\n      text: hi\n';
    f['characters/hero.yaml'] = 'id: hero\nname: H\nrarity: 5\nsubject: s\naffection_scenes:\n  - { threshold: 10, scene: a.date }\n';
    const { content, issues } = loadContent(f);
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(content.scenes['s.a.date']!.affection).toEqual({ character: 'hero', threshold: 10 });
    expect(content.scenes['s.a.intro']!.affection).toBeUndefined();
    f['characters/hero.yaml'] = 'id: hero\nname: H\nrarity: 5\nsubject: s\naffection_scenes:\n  - { threshold: 10, scene: a.intro }\n';
    expect(errors(f).join('\n')).toContain('входит в main_scenes');
  });

  it('reads traits and quotes from the character prompt', () => {
    const f = base();
    f['characters/hero.md'] = '# H\n\n## Характер\n\n- **Смелая.** Всегда.\n- **Добрая**\n\n## Примеры реплик\n\n- «Привет, $x$!»\n';
    const { content, issues } = loadContent(f);
    expect(issues).toEqual([]);
    expect(content.characters.hero).toMatchObject({ traits: ['Смелая', 'Добрая'], quotes: ['Привет, $x$!'] });
    expect(promptProfile('нет разделов')).toEqual({ traits: [], quotes: [] });
  });

  it('requires ids to match file names', () => {
    const f = base();
    f['characters/hero.yaml'] = 'id: heroine\nname: H\nrarity: 5\nsubject: s\n';
    expect(errors(f).join('\n')).toContain('не совпадает с именем файла');
  });
});

describe('resolveRef', () => {
  it('prefixes local refs with the owner path', () => {
    expect(resolveRef('b', ['s'], 2)).toBe('s.b');
    expect(resolveRef('t.sc', ['s'], 3)).toBe('s.t.sc');
    expect(resolveRef('x.y.z', ['s'], 3)).toBe('x.y.z');
    expect(resolveRef('sc', ['s'], 3)).toBeNull();
  });
});
