// Zod schemas for everything under content/. Shared by the app and by CI scripts,
// so this module must stay free of browser- and node-specific imports.
import { z } from 'zod';
import { LookSchema } from '../art/schema.ts';

export const LocalId = z.string().regex(/^[a-z][a-z0-9_]*$/, 'id: латиница в нижнем регистре, цифры и _');
/** A reference to another content object: either a local id or a dotted full id. */
export const Ref = z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/, 'ссылка: id или полный id через точку');

const Rarity = z.union([z.literal(3), z.literal(4), z.literal(5)]);
const Difficulty = z.int().min(1).max(5);
const Probability = z.number().min(0).max(1);

// ---------- economy ----------

export const EconomySchema = z.strictObject({
  pull_cost: z.int().positive(),
  reward_by_difficulty: z.strictObject({
    1: z.int().nonnegative(),
    2: z.int().nonnegative(),
    3: z.int().nonnegative(),
    4: z.int().nonnegative(),
    5: z.int().nonnegative(),
  }),
  /** Reward multiplier once a template has been solved `after` times. Sorted by `after`. */
  decay: z.array(z.strictObject({ after: z.int().positive(), factor: Probability })),
  daily_cap: z.strictObject({
    max_difficulty: Difficulty,
    amount: z.int().nonnegative(),
    timezone: z.string().default('Europe/Moscow'),
  }),
  pity: z.strictObject({
    five_star: z.int().positive(),
    four_star: z.int().positive(),
  }),
  duplicates: z.strictObject({
    max_constellation: z.int().nonnegative(),
    refund: z.strictObject({ 3: z.int().nonnegative(), 4: z.int().nonnegative(), 5: z.int().nonnegative() }),
  }),
  starting_currency: z.int().nonnegative(),
});
export type Economy = z.infer<typeof EconomySchema>;

// ---------- subjects & topics ----------

export const SubjectSchema = z.strictObject({
  id: LocalId,
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.int().default(0),
});
export type Subject = z.infer<typeof SubjectSchema>;

export const TopicSchema = z.strictObject({
  id: LocalId,
  title: z.string().min(1),
  description: z.string().optional(),
  /** Topic refs; local ids resolve within the same subject. */
  requires: z.array(Ref).default([]),
  main_character: LocalId,
  /** Scenes of this topic that form the base course. Completing them all completes the topic. */
  main_scenes: z.array(LocalId).min(1),
});
export type Topic = z.infer<typeof TopicSchema>;

// ---------- figures ----------

/** `{type, ...props}`; the props are validated by the figure plugin (src/figures/core.ts). */
export const FigureSpec = z.looseObject({ type: LocalId });
export type FigureSpec = z.infer<typeof FigureSpec>;

// ---------- scenes ----------

/**
 * `figure` puts a picture on the board; it stays there for the following steps of the same
 * node until another `figure` replaces it or `figure: null` clears the board.
 */
const Board = { figure: FigureSpec.nullable().optional() };
const LineStep = z.strictObject({
  speaker: LocalId,
  emotion: z.string().optional(),
  text: z.string().min(1),
  ...Board,
});
const NarrationStep = z.strictObject({ narration: z.string().min(1), ...Board });
const ChoiceStep = z.strictObject({
  choice: z.strictObject({
    question: z.string().min(1),
    options: z.array(z.strictObject({ text: z.string().min(1), goto: LocalId })).min(2),
  }),
});
const GotoStep = z.strictObject({ goto: LocalId });
export const SceneStepSchema = z.union([LineStep, NarrationStep, ChoiceStep, GotoStep]);
export type SceneStep = z.infer<typeof SceneStepSchema>;

export const SceneSchema = z.strictObject({
  id: LocalId,
  title: z.string().optional(),
  character: LocalId,
  background: z.string().min(1),
  /** Named nodes. Execution starts at `start`; running off the end of a node ends the scene. */
  nodes: z.record(LocalId, z.array(SceneStepSchema).min(1)),
  /** Template refs unlocked when the scene is completed. */
  unlocks: z.array(Ref).default([]),
});
export type Scene = z.infer<typeof SceneSchema>;

// ---------- problem templates ----------

export const ParamSchema = z.union([
  z.strictObject({
    type: z.literal('int'),
    range: z.tuple([z.int(), z.int()]),
    exclude: z.array(z.int()).default([]),
  }),
  z.strictObject({
    type: z.literal('pick'),
    /** Scalars, or records whose fields are addressed as <<name.field>> (for correlated values). */
    values: z.array(z.union([z.string(), z.number(), z.record(LocalId, z.union([z.string(), z.number()]))])).min(1),
  }),
]);
export type Param = z.infer<typeof ParamSchema>;

export const TemplateSchema = z
  .strictObject({
    id: LocalId,
    title: z.string().optional(),
    version: z.int().positive().default(1),
    difficulty: Difficulty,
    /** Problems "with an asterisk": not subject to reward decay. */
    starred: z.boolean().default(false),
    answer_type: LocalId,
    /** Answer-type settings, validated by the plugin's configSchema. */
    config: z.record(z.string(), z.unknown()).default({}),
    params: z.record(LocalId, ParamSchema).default({}),
    /** Text with $inline$ and $$display$$ math. `<<name>>` substitutes a param. */
    statement: z.string().min(1).optional(),
    answer: z.string().min(1).optional(),
    /** Path relative to the topic folder, e.g. generators/foo.py. */
    generator: z.string().regex(/^generators\/[a-z0-9_]+\.py$/).optional(),
    hint: z.string().optional(),
    /** A picture under the statement; may contain <<params>>. */
    figure: FigureSpec.optional(),
  })
  .superRefine((t, ctx) => {
    if (t.generator) {
      for (const k of ['statement', 'answer', 'params', 'figure'] as const) {
        const v = t[k];
        if (v !== undefined && !(typeof v === 'object' && Object.keys(v).length === 0))
          ctx.addIssue({ code: 'custom', path: [k], message: `с generator поле ${k} задаёт генератор` });
      }
    } else {
      if (!t.statement) ctx.addIssue({ code: 'custom', path: ['statement'], message: 'нужен statement или generator' });
      if (!t.answer) ctx.addIssue({ code: 'custom', path: ['answer'], message: 'нужен answer или generator' });
    }
  });
export type Template = z.infer<typeof TemplateSchema>;

// ---------- characters & banners ----------

export const CharacterSchema = z.strictObject({
  id: LocalId,
  name: z.string().min(1),
  rarity: Rarity,
  subject: LocalId,
  /** Topic refs; local ids resolve within `subject`. */
  topics: z.array(Ref).default([]),
  description: z.string().optional(),
  /** emotion -> path inside content/assets/characters/. Missing files render as placeholders. */
  sprites: z.record(z.string(), z.string()).default({}),
  /** Generated pixel portrait (docs/character-art.md). Drawn when there is no sprite file. */
  look: LookSchema.optional(),
  /** Scene refs; `topic.scene` resolves within `subject`. */
  affection_scenes: z.array(z.strictObject({ threshold: z.int().positive(), scene: Ref })).default([]),
});
export type Character = z.infer<typeof CharacterSchema>;

export const BannerSchema = z
  .strictObject({
    id: LocalId,
    title: z.string().min(1),
    subject: LocalId,
    /** Banners sharing a pity group share pity counters. Defaults to the banner id. */
    pity_group: LocalId.optional(),
    rates: z.strictObject({ 3: Probability, 4: Probability, 5: Probability }),
    pool: z.strictObject({
      3: z.array(LocalId).min(1),
      4: z.array(LocalId).min(1),
      5: z.array(LocalId).min(1),
    }),
  })
  .refine((b) => Math.abs(b.rates[3] + b.rates[4] + b.rates[5] - 1) < 1e-9, {
    message: 'сумма rates должна быть равна 1',
    path: ['rates'],
  });
export type Banner = z.infer<typeof BannerSchema>;
