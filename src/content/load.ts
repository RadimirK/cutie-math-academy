// Turns raw content files into an indexed, validated Content object.
// Pure: callers supply the files (Vite glob in the browser, fs in CI scripts).
import { parse as parseYaml } from 'yaml';
import type { z } from 'zod';
import { emotionsOf, lookIssues, partIssues, type PartLibrary } from '../art/render.ts';
import { backdropIssues, propIssues, type PropLibrary } from '../art/scenery.ts';
import { BackdropSchema, PartSchema, PropSchema, SLOTS, type Backdrop, type Slot } from '../art/schema.ts';
import { answerTypes } from '../answer-types/core.ts';
import { FILTER_NAMES, placeholders } from '../core/generate.ts';
import { parseFigure } from '../figures/core.ts';
import {
  BannerSchema,
  CharacterSchema,
  EconomySchema,
  SceneSchema,
  SubjectSchema,
  TemplateSchema,
  TopicSchema,
  type Banner,
  type Character,
  type Economy,
  type Scene,
  type Subject,
  type Template,
  type Topic,
} from './schema.ts';

export interface LoadedSubject extends Subject {
  topics: string[];
}
export interface LoadedTopic extends Omit<Topic, 'main_scenes'> {
  fullId: string;
  subject: string;
  /** Full scene ids, in main_scenes order. */
  main_scenes: string[];
  scenes: string[];
  templates: string[];
}
export interface LoadedScene extends Scene {
  fullId: string;
  topic: string;
  /** Set for a scene listed in a character's affection_scenes: it opens at that affection. */
  affection?: { character: string; threshold: number };
}
export interface LoadedTemplate extends Template {
  fullId: string;
  topic: string;
  generatorSource?: string;
}
export interface LoadedCharacter extends Character {
  /** From the character's .md prompt: trait headings of «Характер» and lines of «Примеры реплик». */
  traits: string[];
  quotes: string[];
}
export type LoadedBanner = Banner;

export interface Content {
  economy: Economy;
  subjects: Record<string, LoadedSubject>;
  topics: Record<string, LoadedTopic>;
  scenes: Record<string, LoadedScene>;
  templates: Record<string, LoadedTemplate>;
  characters: Record<string, LoadedCharacter>;
  banners: Record<string, LoadedBanner>;
  /** Art parts by slot, then id (content/art/parts/<slot>/<id>.yaml). */
  parts: PartLibrary;
  /** Scenery props (content/art/props/<id>.yaml). */
  props: PropLibrary;
  /** Backgrounds of scenes (content/backgrounds/<id>.yaml). */
  backgrounds: Record<string, Backdrop>;
}

export interface Issue {
  level: 'error' | 'warning';
  file: string;
  message: string;
}

/**
 * Resolves a possibly-local ref to a full id of `depth` segments, borrowing the missing
 * leading segments from `base` (the owner's own full id split by dots).
 */
export function resolveRef(ref: string, base: string[], depth: number): string | null {
  const parts = ref.split('.');
  if (parts.length === depth) return ref;
  const need = depth - parts.length;
  if (need < 0 || need > base.length) return null;
  return [...base.slice(0, need), ...parts].join('.');
}

const PATTERNS: { re: RegExp; kind: string }[] = [
  { re: /^economy\.yaml$/, kind: 'economy' },
  { re: /^subjects\/([^/]+)\/subject\.yaml$/, kind: 'subject' },
  { re: /^subjects\/([^/]+)\/topics\/([^/]+)\/topic\.yaml$/, kind: 'topic' },
  { re: /^subjects\/([^/]+)\/topics\/([^/]+)\/scenes\/([^/]+)\.yaml$/, kind: 'scene' },
  { re: /^subjects\/([^/]+)\/topics\/([^/]+)\/problems\/([^/]+)\.yaml$/, kind: 'template' },
  { re: /^subjects\/([^/]+)\/topics\/([^/]+)\/generators\/([^/]+\.py)$/, kind: 'generator' },
  { re: /^characters\/([^/]+)\.yaml$/, kind: 'character' },
  { re: /^characters\/([^/]+)\.md$/, kind: 'character_prompt' },
  { re: /^banners\/([^/]+)\.yaml$/, kind: 'banner' },
  { re: /^art\/parts\/([^/]+)\/([^/]+)\.yaml$/, kind: 'part' },
  { re: /^art\/props\/([^/]+)\.yaml$/, kind: 'prop' },
  { re: /^backgrounds\/([^/]+)\.yaml$/, kind: 'background' },
];

/** Trait headings (`- **Тёплая.** …` under «Характер») and quotes (under «Примеры реплик»). */
export function promptProfile(md: string): { traits: string[]; quotes: string[] } {
  const traits: string[] = [];
  const quotes: string[] = [];
  let section = '';
  for (const line of md.split('\n')) {
    const h = /^## (.+)/.exec(line);
    if (h) section = h[1]!.trim();
    else if (section === 'Характер') {
      const t = /^- \*\*(.+?)\.?\*\*/.exec(line);
      if (t) traits.push(t[1]!);
    } else if (section === 'Примеры реплик') {
      const q = /^- «(.+)»\s*$/.exec(line);
      if (q) quotes.push(q[1]!);
    }
  }
  return { traits, quotes };
}

/** @param files map from path relative to content/ (e.g. "banners/x.yaml") to file text. */
export function loadContent(files: Record<string, string>): { content: Content; issues: Issue[] } {
  const issues: Issue[] = [];
  const err = (file: string, message: string) => issues.push({ level: 'error', file, message });
  const warn = (file: string, message: string) => issues.push({ level: 'warning', file, message });

  const content: Content = {
    economy: undefined as unknown as Economy,
    subjects: {},
    topics: {},
    scenes: {},
    templates: {},
    characters: {},
    banners: {},
    parts: {},
    props: {},
    backgrounds: {},
  };
  const fileOf = new Map<string, string>(); // full id (with kind prefix) -> file, for messages
  const generators: Record<string, string> = {};
  const prompts: Record<string, string> = {};

  function parse<S extends z.ZodType>(file: string, text: string, schema: S): z.infer<S> | null {
    let raw: unknown;
    try {
      raw = parseYaml(text);
    } catch (e) {
      err(file, `YAML: ${(e as Error).message}`);
      return null;
    }
    const r = schema.safeParse(raw);
    if (!r.success) {
      for (const i of r.error.issues) err(file, `${i.path.join('.') || '(корень)'}: ${i.message}`);
      return null;
    }
    return r.data;
  }

  function register<T>(kind: string, table: Record<string, T>, id: string, value: T, file: string) {
    const key = `${kind}:${id}`;
    if (fileOf.has(key)) return err(file, `повторяющийся id ${id} (уже в ${fileOf.get(key)})`);
    fileOf.set(key, file);
    table[id] = value;
  }

  function expectName(file: string, expected: string, actual: string) {
    if (expected !== actual) err(file, `id «${actual}» не совпадает с именем файла или папки «${expected}»`);
  }

  // Pass 1: parse every file.
  for (const [file, text] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    const match = PATTERNS.map((p) => ({ p, m: p.re.exec(file) })).find((x) => x.m);
    if (!match) {
      err(file, 'файл лежит не на своём месте (см. docs/design.md, раздел «Контент»)');
      continue;
    }
    const m = match.m!;
    switch (match.p.kind) {
      case 'economy': {
        const e = parse(file, text, EconomySchema);
        if (e) content.economy = e;
        break;
      }
      case 'subject': {
        const s = parse(file, text, SubjectSchema);
        if (!s) break;
        expectName(file, m[1]!, s.id);
        register('subject', content.subjects, s.id, { ...s, topics: [] }, file);
        break;
      }
      case 'topic': {
        const t = parse(file, text, TopicSchema);
        if (!t) break;
        expectName(file, m[2]!, t.id);
        const fullId = `${m[1]}.${t.id}`;
        register('topic', content.topics, fullId, {
          ...t,
          fullId,
          subject: m[1]!,
          requires: t.requires.map((r) => resolveRef(r, [m[1]!], 2) ?? r),
          main_scenes: t.main_scenes.map((s) => `${fullId}.${s}`),
          scenes: [],
          templates: [],
        }, file);
        break;
      }
      case 'scene': {
        const s = parse(file, text, SceneSchema);
        if (!s) break;
        expectName(file, m[3]!, s.id);
        const topic = `${m[1]}.${m[2]}`;
        const fullId = `${topic}.${s.id}`;
        const base = [m[1]!, m[2]!];
        register('scene', content.scenes, fullId, {
          ...s,
          fullId,
          topic,
          unlocks: s.unlocks.map((u) => resolveRef(u, base, 3) ?? u),
        }, file);
        break;
      }
      case 'template': {
        const t = parse(file, text, TemplateSchema);
        if (!t) break;
        expectName(file, m[3]!, t.id);
        const topic = `${m[1]}.${m[2]}`;
        register('template', content.templates, `${topic}.${t.id}`, { ...t, fullId: `${topic}.${t.id}`, topic }, file);
        break;
      }
      case 'generator':
        generators[`${m[1]}.${m[2]}/generators/${m[3]}`] = text;
        break;
      case 'character': {
        const c = parse(file, text, CharacterSchema);
        if (!c) break;
        expectName(file, m[1]!, c.id);
        register('character', content.characters, c.id, {
          ...c,
          topics: c.topics.map((t) => resolveRef(t, [c.subject], 2) ?? t),
          affection_scenes: c.affection_scenes.map((a) => ({ ...a, scene: resolveRef(a.scene, [c.subject], 3) ?? a.scene })),
          traits: [],
          quotes: [],
        }, file);
        break;
      }
      case 'character_prompt':
        prompts[m[1]!] = text;
        break;
      case 'banner': {
        const b = parse(file, text, BannerSchema);
        if (!b) break;
        expectName(file, m[1]!, b.id);
        register('banner', content.banners, b.id, b, file);
        break;
      }
      case 'part': {
        const slot = m[1] as Slot;
        if (!SLOTS.includes(slot)) {
          err(file, `нет слота ${slot} (есть: ${SLOTS.join(', ')})`);
          break;
        }
        const p = parse(file, text, PartSchema);
        if (!p) break;
        expectName(file, m[2]!, p.id);
        for (const message of partIssues(p)) err(file, message);
        register(`part.${slot}`, (content.parts[slot] ??= {}), p.id, p, file);
        break;
      }
      case 'prop': {
        const p = parse(file, text, PropSchema);
        if (!p) break;
        expectName(file, m[1]!, p.id);
        for (const message of propIssues(p)) err(file, message);
        register('prop', content.props, p.id, p, file);
        break;
      }
      case 'background': {
        const b = parse(file, text, BackdropSchema);
        if (!b) break;
        expectName(file, m[1]!, b.id);
        register('background', content.backgrounds, b.id, b, file);
        break;
      }
    }
  }
  if (!content.economy && !issues.some((i) => i.file === 'economy.yaml')) err('economy.yaml', 'файл отсутствует');

  // Pass 2: attach children and check references.
  const f = (kind: string, id: string) => fileOf.get(`${kind}:${id}`) ?? id;

  for (const t of Object.values(content.topics)) {
    const subj = content.subjects[t.subject];
    if (!subj) err(f('topic', t.fullId), `нет subject.yaml для предмета ${t.subject}`);
    else subj.topics.push(t.fullId);
    for (const r of t.requires) if (!content.topics[r]) err(f('topic', t.fullId), `requires: нет темы ${r}`);
    if (!content.characters[t.main_character]) err(f('topic', t.fullId), `main_character: нет персонажа ${t.main_character}`);
    for (const s of t.main_scenes) if (!content.scenes[s]) err(f('topic', t.fullId), `main_scenes: нет сцены ${s}`);
  }

  for (const s of Object.values(content.scenes)) {
    const file = f('scene', s.fullId);
    const topic = content.topics[s.topic];
    if (!topic) err(file, `нет topic.yaml для темы ${s.topic}`);
    else topic.scenes.push(s.fullId);
    if (!content.characters[s.character]) err(file, `character: нет персонажа ${s.character}`);
    if (!content.backgrounds[s.background]) err(file, `background: нет фона ${s.background} (content/backgrounds/${s.background}.yaml)`);
    if (!s.nodes.start) err(file, 'нет узла start');
    const reachable = new Set<string>();
    const visit = (node: string) => {
      if (reachable.has(node) || !s.nodes[node]) return;
      reachable.add(node);
      for (const step of s.nodes[node]) {
        if ('goto' in step) visit(step.goto);
        if ('choice' in step) step.choice.options.forEach((o) => visit(o.goto));
      }
    };
    visit('start');
    for (const [name, steps] of Object.entries(s.nodes)) {
      if (!reachable.has(name)) warn(file, `узел ${name} недостижим из start`);
      steps.forEach((step, i) => {
        const where = `nodes.${name}[${i}]`;
        const gotos = 'goto' in step ? [step.goto] : 'choice' in step ? step.choice.options.map((o) => o.goto) : [];
        for (const g of gotos) if (!s.nodes[g]) err(file, `${where}: goto на несуществующий узел ${g}`);
        if (('goto' in step || 'choice' in step) && i !== steps.length - 1)
          err(file, `${where}: goto и choice должны быть последним шагом узла`);
        if ('speaker' in step) {
          const ch = content.characters[step.speaker];
          if (!ch) err(file, `${where}: speaker: нет персонажа ${step.speaker}`);
          else if (step.emotion && !(step.emotion in ch.sprites) && !(ch.look && emotionsOf(ch.look).includes(step.emotion)))
            warn(file, `${where}: у ${ch.id} нет ни спрайта, ни эмоции внешности ${step.emotion}`);
        }
        if ('figure' in step && step.figure) {
          const r = parseFigure(step.figure);
          if (!r.ok) err(file, `${where}.figure: ${r.error}`);
        }
      });
    }
    for (const u of s.unlocks) if (!content.templates[u]) err(file, `unlocks: нет шаблона ${u}`);
  }

  for (const t of Object.values(content.templates)) {
    const file = f('template', t.fullId);
    const topic = content.topics[t.topic];
    if (!topic) err(file, `нет topic.yaml для темы ${t.topic}`);
    else topic.templates.push(t.fullId);
    const at = answerTypes[t.answer_type];
    if (!at) err(file, `answer_type: неизвестный тип ${t.answer_type} (есть: ${Object.keys(answerTypes).join(', ')})`);
    else if (!t.generator) {
      // Config may contain placeholders, so it is validated per instance in the self-test;
      // here only the shape is checked when it has none.
      if (!JSON.stringify(t.config).includes('<<')) {
        const r = at.configSchema.safeParse(t.config);
        if (!r.success) for (const i of r.error.issues) err(file, `config.${i.path.join('.')}: ${i.message}`);
      }
    }
    if (t.figure && !JSON.stringify(t.figure).includes('<<')) {
      const r = parseFigure(t.figure);
      if (!r.ok) err(file, `figure: ${r.error}`);
    }
    if (t.generator) {
      const src = generators[`${t.topic}/${t.generator}`];
      if (src === undefined) err(file, `generator: нет файла ${t.generator}`);
      else t.generatorSource = src;
    } else {
      const texts = [t.statement!, t.answer!, JSON.stringify(t.config), JSON.stringify(t.figure ?? {})];
      const used = new Set<string>();
      for (const text of texts)
        for (const p of placeholders(text)) {
          const param = p.name.split('.')[0]!;
          used.add(param);
          if (!(param in t.params)) err(file, `<<${p.name}>>: параметр не объявлен в params`);
          if (p.filter && !FILTER_NAMES.includes(p.filter)) err(file, `<<${p.name}|${p.filter}>>: неизвестный фильтр`);
        }
      for (const name of Object.keys(t.params)) if (!used.has(name)) warn(file, `параметр ${name} нигде не используется`);
    }
  }
  const unlocked = new Set(Object.values(content.scenes).flatMap((s) => s.unlocks));
  for (const t of Object.values(content.templates))
    if (!unlocked.has(t.fullId)) warn(f('template', t.fullId), 'шаблон не открывается ни одной сценой');

  for (const c of Object.values(content.characters)) {
    const file = f('character', c.id);
    if (!content.subjects[c.subject]) err(file, `subject: нет предмета ${c.subject}`);
    for (const t of c.topics) if (!content.topics[t]) err(file, `topics: нет темы ${t}`);
    for (const a of c.affection_scenes) {
      const scene = content.scenes[a.scene];
      if (!scene) err(file, `affection_scenes: нет сцены ${a.scene}`);
      else if (scene.affection) err(file, `affection_scenes: сцена ${a.scene} уже открывается симпатией ${scene.affection.character}`);
      else if (content.topics[scene.topic]?.main_scenes.includes(scene.fullId))
        err(file, `affection_scenes: ${a.scene} входит в main_scenes темы, её нельзя закрыть симпатией`);
      else scene.affection = { character: c.id, threshold: a.threshold };
    }
    const prompt = prompts[c.id];
    if (prompt === undefined) warn(file, `нет characters/${c.id}.md с характером`);
    else Object.assign(c, promptProfile(prompt));
    if (c.look) for (const message of lookIssues(c.look, content.parts)) err(file, `look: ${message}`);
  }

  // A variant of a background gets its base's palette and props under its own.
  const resolved = new Map<string, Backdrop>();
  const inherit = (b: Backdrop, chain: string[]): Backdrop => {
    if (!b.base) return b;
    if (chain.includes(b.id)) throw new Error(`base: цикл ${[...chain, b.id].join(' → ')}`);
    const base = content.backgrounds[b.base];
    if (!base) throw new Error(`base: нет фона ${b.base}`);
    const r = resolved.get(base.id) ?? inherit(base, [...chain, b.id]);
    for (const id of Object.keys(b.set))
      if (!r.props.some((p) => p.prop === id)) throw new Error(`set: в фоне ${base.id} нет предмета ${id}`);
    const props = r.props.map((p) => (b.set[p.prop] ? { ...p, ...b.set[p.prop] } : p));
    return { ...b, palette: { ...r.palette, ...b.palette }, props: [...props, ...b.props] };
  };
  for (const b of Object.values(content.backgrounds)) {
    try {
      resolved.set(b.id, inherit(b, []));
    } catch (e) {
      err(f('background', b.id), (e as Error).message);
    }
  }
  for (const [id, b] of resolved) content.backgrounds[id] = b;
  for (const b of resolved.values())
    for (const message of backdropIssues(b, content.props)) err(f('background', b.id), message);

  for (const b of Object.values(content.banners)) {
    const file = f('banner', b.id);
    if (!content.subjects[b.subject]) err(file, `subject: нет предмета ${b.subject}`);
    for (const rarity of [3, 4, 5] as const)
      for (const id of b.pool[rarity]) {
        const c = content.characters[id];
        if (!c) err(file, `pool.${rarity}: нет персонажа ${id}`);
        else if (c.rarity !== rarity) err(file, `pool.${rarity}: у ${id} редкость ${c.rarity}★`);
      }
  }

  // Topic graph must be acyclic.
  const state = new Map<string, 'visiting' | 'done'>();
  const dfs = (id: string, path: string[]): void => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      err(f('topic', id), `цикл в requires: ${[...path.slice(path.indexOf(id)), id].join(' → ')}`);
      return;
    }
    state.set(id, 'visiting');
    for (const r of content.topics[id]?.requires ?? []) if (content.topics[r]) dfs(r, [...path, id]);
    state.set(id, 'done');
  };
  for (const id of Object.keys(content.topics)) dfs(id, []);

  return { content, issues };
}
