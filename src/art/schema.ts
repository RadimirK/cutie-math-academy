// Schemas of the character art: parts of the library (content/art/parts/<slot>/<id>.yaml)
// and a character's look (the `look:` block of content/characters/<id>.yaml).
// See docs/character-art.md. No React here: CI scripts import it.
import { z } from 'zod';

/** Slots in painting order, back to front. A part belongs to the slot named by its folder. */
export const SLOTS = [
  'hair_back', 'body', 'legwear', 'shoes', 'bottom', 'outfit', 'head', 'cheeks', 'eyes', 'brows', 'mouth', 'hair_front', 'accessory', 'fx',
] as const;
export const Slot = z.enum(SLOTS);
export type Slot = z.infer<typeof Slot>;

/** Shapes carry materials, not colours: the colours come from the character's palette. */
export const MATERIALS = [
  'skin', 'hair', 'eyes', 'eye_white', 'cloth', 'cloth2', 'skirt', 'legwear', 'shoes', 'accent', 'line', 'mouth', 'blush', 'metal', 'shine',
] as const;
export const Material = z.enum(MATERIALS);
export type Material = z.infer<typeof Material>;

const Name = z.string().regex(/^[a-z][a-z0-9_]*$/, 'латиница в нижнем регистре, цифры, _');

/** A number or an arithmetic expression over numeric params: `"$length + 0.1"`. */
export const Expr = z.union([z.number(), z.string().min(1)]);
/**
 * A point in head space: (0, 0) is the centre of the head, 1 is the head radius, y points down.
 * The figure stands from about -1.2 (top of the hair) to 9.3 (soles).
 */
const Pt = z.tuple([Expr, Expr]);

const common = {
  material: Material.optional(),
  /** Fixed tone 0..4 (outline, shadow, base, light, highlight): no shading, no outline. */
  tone: z.int().min(0).max(4).optional(),
  /** Paint this shape just in front of another slot's own parts (twin tails over the jacket). */
  slot: Slot.optional(),
  /** Also draw the mirror image across the vertical axis of the face. */
  mirror: z.boolean().optional(),
  /** Other shapes can clip to this one by name (the body's `legs`, `arms`, `torso`). */
  name: Name.optional(),
  /** Keep only the part of the shape that lies on these named shapes: clothes follow the body. */
  clip: z.union([Name, z.array(Name).min(1)]).optional(),
  /** Grow (or with a negative number shrink) the clip region by whole pixels. */
  grow: z.int().min(-3).max(3).optional(),
  /** Cast a shadow onto whatever lies behind (overrides the part's `shadow`). */
  shadow: z.boolean().optional(),
  /** Shade and outline this shape on its own, like a lock of `seams` hair (a lapel on a jacket). */
  seam: z.boolean().optional(),
  /** Cut the shape out of what the part has drawn so far instead of adding it. */
  erase: z.boolean().optional(),
  /**
   * Draw only when params have these values: an option or a list of options of an enum
   * param, or `{min, max}` for a numeric one (`{ chest: { min: 0.3 } }`).
   */
  when: z.record(Name, z.union([Name, z.array(Name), z.strictObject({ min: z.number().optional(), max: z.number().optional() })])).optional(),
};

const EllipseShape = z.strictObject({
  ellipse: z.strictObject({ at: Pt, r: z.union([Expr, Pt]), rot: Expr.optional() }),
  /** Only the one-pixel rim (spectacle frames). */
  hollow: z.boolean().optional(),
  ...common,
});
const PolyShape = z.strictObject({
  poly: z.array(Pt).min(3),
  /** A rounded curve through the points instead of straight edges. */
  smooth: z.boolean().optional(),
  ...common,
});
const StrandShape = z.strictObject({
  /** A hair lock: a curve from root to tip, `bend` bows it sideways, width tapers. */
  strand: z.strictObject({ from: Pt, to: Pt, bend: Expr.optional(), width: z.tuple([Expr, Expr]) }),
  ...common,
});
const StrokeShape = z.strictObject({
  /** A one-pixel line through the points. */
  stroke: z.array(Pt).min(2),
  smooth: z.boolean().optional(),
  closed: z.boolean().optional(),
  ...common,
});
const StampKey = z.string().regex(new RegExp(`^((${MATERIALS.join('|')})(:[0-4])?|#[0-9a-fA-F]{6})$`), 'материал, материал:тон или цвет #rrggbb');
const StampShape = z.strictObject({
  /**
   * Pixels drawn literally, centred on `at`: one character per pixel, `.` or space is empty,
   * `key` maps the other characters to `material`, `material:tone` or a fixed `#rrggbb`
   * (sweat drops, anger marks). For tiny things: eyes, mouths, glints. Mirrored stamps are flipped unless `flip: false`.
   */
  stamp: z.strictObject({
    at: Pt,
    rows: z.array(z.string()).min(1),
    key: z.record(z.string().length(1), StampKey),
    flip: z.boolean().optional(),
    /** Whole pixels to move by, applied after mirroring: both eyes look the same way. */
    shift: z.tuple([Expr, Expr]).optional(),
  }),
  ...common,
});

export const ShapeSchema = z.union([EllipseShape, PolyShape, StrandShape, StrokeShape, StampShape]);
export type Shape = z.infer<typeof ShapeSchema>;

export const ParamDef = z.union([
  z.strictObject({ range: z.tuple([z.number(), z.number()]), default: z.number(), int: z.boolean().optional(), desc: z.string().optional() }),
  z.strictObject({ options: z.array(Name).min(1), default: Name, desc: z.string().optional() }),
]);
export type ParamDef = z.infer<typeof ParamDef>;

export const PartSchema = z.strictObject({
  id: Name,
  /** What it looks like, in words: the catalogue the designer model reads. */
  desc: z.string().min(1),
  /** Material of shapes that name none. */
  material: Material,
  /** round: shaded as a volume lit from the top left; flat: only shadows cast on it; none: as drawn. */
  shade: z.enum(['round', 'flat', 'none']).default('round'),
  outline: z.boolean().default(true),
  /** Every shape is its own lock: shaded and outlined separately (hair). */
  seams: z.boolean().default(false),
  /**
   * Shapes of this part cast a shadow onto whatever lies behind them, shifted away from the
   * light: bangs onto the forehead, the chin onto the neck, a raised arm onto the jacket.
   */
  shadow: z.boolean().default(false),
  /** The glossy ring anime hair has. */
  highlight: z.literal('hair_band').optional(),
  params: z.record(Name, ParamDef).default({}),
  shapes: z.array(ShapeSchema).min(1),
});
export type Part = z.infer<typeof PartSchema>;

const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'цвет вида #rrggbb');
const ParamValue = z.union([z.number(), Name]);

/** A part in a slot with its params: `{ part: blunt_bangs, length: 0.1 }`. */
export const PartUse = z.object({ part: Name }).catchall(ParamValue);
export type PartUse = z.infer<typeof PartUse>;
/** An emotion's change to a slot: other params, or another part. */
export const PartOverride = z.object({ part: Name.optional() }).catchall(ParamValue);
export type PartOverride = z.infer<typeof PartOverride>;
/** Changes to several slots: an emotion, or a frame of an animation. */
export const Overrides = z.partialRecord(Slot, PartOverride);
export type Overrides = z.infer<typeof Overrides>;

export const LookSchema = z.strictObject({
  /** Head size relative to the standard one. */
  head: z.number().min(0.9).max(1.1).default(1),
  /** Shoulder width; every part sees it as `$shoulders`. */
  shoulders: z.number().min(0.85).max(1.15).default(1),
  /** Bust size, 0 flat to 1 large; every part sees it as `$chest`. */
  chest: z.number().min(0).max(1).default(0.35),
  palette: z.strictObject({
    skin: Hex,
    hair: Hex,
    eyes: Hex,
    cloth: Hex,
    cloth2: Hex.optional(),
    skirt: Hex.optional(),
    legwear: Hex.optional(),
    shoes: Hex.optional(),
    accent: Hex.optional(),
    metal: Hex.optional(),
    blush: Hex.optional(),
    line: Hex.optional(),
  }),
  /** Slots that are omitted use the style's default part (body, head, mouth) or stay empty. */
  parts: z.partialRecord(Slot, z.union([PartUse, z.array(PartUse).min(1)])),
  /**
   * emotion -> this character's own overrides. They go on top of the house preset of the same
   * emotion (style.ts, EMOTIONS) or define an emotion of her own.
   */
  emotions: z.record(Name, Overrides).default({}),
});
export type Look = z.infer<typeof LookSchema>;
