// Look + part library -> pixels. Deterministic and DOM-free: the same YAML always gives the
// same sprite, in the browser and in CI.
//
// State: base look -> emotion (house preset + the character's own changes) -> animation frame.
// Each layer is the same kind of thing, overrides of slot params, so an animation is just a
// sequence of overrides and needs nothing from the renderer.
//
// Pipeline: resolve the state -> rasterise every shape into masks -> paint the
// parts back to front -> shade volumes -> cast shadows of upper layers -> hair highlight ->
// selective outline -> colours from the palette's ramps.
import { evalExpr, exprVars, type Expr } from './expr.ts';
import {
  dilate,
  ellipsePoints,
  emptyMask,
  fillPolygon,
  flipAbout,
  shift,
  smoothPath,
  strandPolygon,
  strokePath,
  type Mask,
  type Pt,
  type Size,
} from './raster.ts';
import { SLOTS, type Look, type Overrides, type ParamDef, type Part, type PartOverride, type PartUse, type PropShape, type Shape, type Slot } from './schema.ts';
import { parseHex, type RGB } from './color.ts';
import { ANIMATIONS, CAST_OFFSET, DEFAULT_PARTS, EMOTIONS, FRAMES, HEAD, RIG, SHADOW_DIR, SIZE, palette, type Frame } from './style.ts';

export type PartLibrary = Partial<Record<Slot, Record<string, Part>>>;

export interface Sprite {
  w: number;
  h: number;
  rgba: Uint8ClampedArray<ArrayBuffer>;
}

/** A part in its slot with every param resolved. */
export interface Placed {
  slot: Slot;
  part: Part;
  nums: Record<string, number>;
  enums: Record<string, string>;
}

/** The part name that empties a slot, for emotions that drop something (`cheeks: {part: none}`). */
export const NO_PART = 'none';

/**
 * Body measurements every part can refer to, as `$name`. Frames of an animation can change
 * them too: a new smooth motion (breathing, swaying hair) is a new one here and in the look.
 */
export const GLOBAL_PARAMS = ['shoulders', 'chest'] as const;
export type GlobalParam = (typeof GLOBAL_PARAMS)[number];
const globals = (look: Look): Record<GlobalParam, number> => ({ shoulders: look.shoulders, chest: look.chest });

/** Defaults of a part's params, overridden by a use of it; `where` names it in messages. */
export function resolveParams(
  id: string,
  params: Record<string, ParamDef>,
  use: Record<string, unknown>,
  where: string,
  skip: string[],
  base: Record<string, number> = {},
): { nums: Record<string, number>; enums: Record<string, string> } {
  const nums: Record<string, number> = { ...base };
  const enums: Record<string, string> = {};
  for (const [name, def] of Object.entries(params)) {
    if ('range' in def) nums[name] = def.default;
    else enums[name] = def.default;
  }
  for (const [name, value] of Object.entries(use)) {
    if (skip.includes(name)) continue;
    const def = params[name];
    const at = `${where}.${name}`;
    if (!def) throw new Error(`${at}: у ${id} нет параметра ${name} (есть: ${Object.keys(params).join(', ') || 'нет'})`);
    if ('range' in def) {
      if (typeof value !== 'number') throw new Error(`${at}: нужно число`);
      const [lo, hi] = def.range;
      if (value < lo || value > hi) throw new Error(`${at}: ${value} вне диапазона [${lo}, ${hi}]`);
      if (def.int && !Number.isInteger(value)) throw new Error(`${at}: нужно целое число`);
      nums[name] = value;
    } else {
      if (typeof value !== 'string' || !def.options.includes(value))
        throw new Error(`${at}: «${value}» не из вариантов ${def.options.join(', ')}`);
      enums[name] = value;
    }
  }
  return { nums, enums };
}

function place(slot: Slot, use: PartUse, lib: PartLibrary, g: Record<string, number>): Placed {
  const part = lib[slot]?.[use.part];
  if (!part) throw new Error(`${slot}: нет детали ${use.part} (есть: ${Object.keys(lib[slot] ?? {}).join(', ') || 'ничего'})`);
  return { slot, part, ...resolveParams(`детали ${part.id}`, part.params, use, slot, ['part'], g) };
}

/** What to draw: an emotion, and on top of it a frame of an animation. */
export interface FigureState {
  emotion?: string;
  overlay?: Overrides;
  /** body measurements of this frame instead of the look's */
  globals?: Partial<Record<GlobalParam, number>>;
}

/** Emotions a look can show: the house ones and her own. */
export function emotionsOf(look: Look): string[] {
  return [...new Set([...Object.keys(EMOTIONS), ...Object.keys(look.emotions)])];
}

/** One slot's override followed by another: another part starts from its own defaults. */
function layer(a: PartOverride | undefined, b: PartOverride | undefined): PartOverride | undefined {
  if (!a || !b) return a ?? b;
  return b.part && b.part !== a.part ? b : { ...a, ...b };
}

/** The house preset of an emotion with the character's changes on top. */
function emotionOverrides(look: Look, emotion?: string): Overrides {
  if (!emotion) return {};
  const preset = EMOTIONS[emotion] ?? {};
  const own = look.emotions[emotion] ?? {};
  return Object.fromEntries(SLOTS.map((s) => [s, layer(preset[s], own[s])]).filter(([, o]) => o));
}

/**
 * The look in a state: what to draw, in slot order. Throws on the first problem, or collects
 * every problem into `issues` and skips the slots that have one.
 */
export function resolveLook(look: Look, lib: PartLibrary, state: FigureState = {}, issues?: string[]): Placed[] {
  const emotion = emotionOverrides(look, state.emotion);
  const overlay = state.overlay ?? {};
  const g = { ...globals(look), ...state.globals };
  const out: Placed[] = [];
  for (const slot of SLOTS) {
    try {
      out.push(...resolveSlot(look, lib, slot, [emotion[slot], overlay[slot]], g, state.emotion));
    } catch (e) {
      if (!issues) throw e;
      issues.push((e as Error).message);
    }
  }
  return out;
}

function resolveSlot(
  look: Look,
  lib: PartLibrary,
  slot: Slot,
  overrides: (PartOverride | undefined)[],
  g: Record<string, number>,
  emotion?: string,
): Placed[] {
  const base = look.parts[slot] ?? (DEFAULT_PARTS[slot] ? { part: DEFAULT_PARTS[slot] } : undefined);
  let uses: PartUse[] = base ? (Array.isArray(base) ? base : [base]) : [];
  for (const o of overrides) {
    if (!o) continue;
    // A slot the look leaves empty stays empty, unless the override names a part.
    if (!o.part && (uses.length === 0 || uses[0]!.part === NO_PART)) continue;
    if (uses.length > 1) throw new Error(`эмоция ${emotion}: в слоте ${slot} несколько деталей, его нельзя переопределять`);
    uses = [layer(uses[0], o) as PartUse];
  }
  return uses.filter((use) => use.part !== NO_PART).map((use) => place(slot, use, lib, g));
}

/** Frames of an animation in a state, or none if it does not apply there (blink with eyes shut). */
export function animationFrames(
  look: Look,
  lib: PartLibrary,
  name: string,
  emotion?: string,
): { ms: number; overlay: Overrides; globals?: Partial<Record<GlobalParam, number>> }[] {
  const anim = ANIMATIONS[name];
  if (!anim) throw new Error(`нет анимации ${name}`);
  if (anim.when) {
    const placed = resolveLook(look, lib, { emotion });
    for (const [slot, params] of Object.entries(anim.when)) {
      const pl = placed.find((p) => p.slot === slot);
      if (!pl) return [];
      for (const [k, opts] of Object.entries(params)) if (!opts.includes(pl.enums[k]!)) return [];
    }
  }
  return anim.frames.map((f) => ({ ms: f.ms, overlay: f.set ?? {}, globals: f.globals }));
}

/** A material of the palette, or a fixed colour `#rrggbb`. */
type Paint = string;

/** A shape of a character part or of a prop: the painter does not care which materials. */
type AnyShape = Shape | PropShape;

/**
 * A part laid onto a canvas: what the painter needs to draw it. Characters and backgrounds
 * both come down to a list of these.
 */
export interface Layer {
  part: { id: string; material: string; shade: 'round' | 'flat' | 'none'; outline: boolean; seams: boolean; shadow: boolean; highlight?: 'hair_band'; shapes: AnyShape[] };
  nums: Record<string, number>;
  enums: Record<string, string>;
  /** Canvas pixel of the part's (0, 0), which is also its mirror axis, and pixels per unit. */
  origin: Pt;
  unit: number;
  /** Names the part in messages. */
  where: string;
  /** Depth of a shape: its own, or of the slot it is moved to (`slot` of a shape). */
  depth: (slot?: Slot) => { key: string; z: number };
}

interface Fragment {
  mask: Mask;
  material: Paint;
  /** fixed tone, or null for shaded pixels */
  tone: number | null;
  /** copy of a repeated shape */
  copy: number;
}

/** Every expression a shape contains (for validation). */
export function shapeExprs(shape: AnyShape): Expr[] {
  const pts = (ps: [Expr, Expr][]) => ps.flat();
  const rep = shape.repeat ? [shape.repeat.count, ...shape.repeat.step] : [];
  if ('ellipse' in shape) {
    const { at, r, rot } = shape.ellipse;
    return [...rep, ...at, ...(Array.isArray(r) ? r : [r]), ...(rot === undefined ? [] : [rot])];
  }
  if ('poly' in shape) return [...rep, ...pts(shape.poly)];
  if ('strand' in shape) {
    const { from, to, bend, width } = shape.strand;
    return [...rep, ...from, ...to, ...width, ...(bend === undefined ? [] : [bend])];
  }
  if ('stroke' in shape) return [...rep, ...pts(shape.stroke)];
  return [...rep, ...shape.stamp.at, ...(shape.stamp.shift ?? [])];
}

/** Masks of the shapes that have a `name`, which other shapes can `clip` to. */
type Names = Map<string, Mask>;

const matches = (when: AnyShape['when'], pl: { nums: Record<string, number>; enums: Record<string, string> }) =>
  !when ||
  Object.entries(when).every(([k, v]) => {
    if (typeof v === 'string') return pl.enums[k] === v;
    if (Array.isArray(v)) return v.includes(pl.enums[k]!);
    const n = pl.nums[k]!;
    return (v.min === undefined || n >= v.min) && (v.max === undefined || n <= v.max);
  });

/** Most copies a repeated shape may draw: a guard against a runaway `count`. */
const MAX_COPIES = 400;

function fragments(shape: AnyShape, layer: Layer, names: Names, size: Size): Fragment[] {
  if (!shape.repeat) return copyFragments(shape, layer, names, size, layer.nums, [0, 0], shape.material ?? layer.part.material, 0);
  const count = Math.round(evalExpr(shape.repeat.count, layer.nums));
  if (count > MAX_COPIES) throw new Error(`${layer.where}: repeat.count ${count} больше ${MAX_COPIES}`);
  const out: Fragment[] = [];
  for (let i = 0; i < count; i++) {
    const nums = { ...layer.nums, i };
    const step = shape.repeat.step.map((e) => evalExpr(e, nums) * i) as Pt;
    const material = shape.cycle ? shape.cycle[i % shape.cycle.length]! : (shape.material ?? layer.part.material);
    out.push(...copyFragments(shape, layer, names, size, nums, step, material, i));
  }
  return out;
}

function copyFragments(shape: AnyShape, layer: Layer, names: Names, size: Size, nums: Record<string, number>, off: Pt, material: Paint, copy: number): Fragment[] {
  const clip = (m: Mask): Mask => {
    if (!shape.clip) return m;
    const region = emptyMask(size);
    for (const name of Array.isArray(shape.clip) ? shape.clip : [shape.clip]) {
      const n = names.get(name);
      if (!n) throw new Error(`${layer.where}: clip: нет фигуры с name: ${name} (есть: ${[...names.keys()].join(', ') || 'нет'})`);
      for (let i = 0; i < n.length; i++) region[i] = region[i]! | n[i]!;
    }
    const allowed = shape.grow ? dilate(region, size, shape.grow) : region;
    const out = new Uint8Array(m.length);
    for (let i = 0; i < m.length; i++) out[i] = m[i]! & allowed[i]!;
    return out;
  };
  const { origin, unit } = layer;
  const num = (e: Expr) => evalExpr(e, nums);
  const P = ([x, y]: [Expr, Expr]): Pt => [origin[0] + (num(x) + off[0]) * unit, origin[1] + (num(y) + off[1]) * unit];
  // Mirroring is about the part's own axis: the face for a character, (0, 0) for a prop.
  const axis2 = Math.round(origin[0] * 2);
  const mirrored = (m: Mask) => {
    if (!shape.mirror) return m;
    const f = flipAbout(m, size, axis2);
    for (let i = 0; i < m.length; i++) f[i] = f[i]! | m[i]!;
    return f;
  };

  if ('stamp' in shape) {
    const { rows, key, flip } = shape.stamp;
    const [cx, cy] = P(shape.stamp.at);
    const cols = Math.max(...rows.map((row) => row.length));
    const x0 = Math.round(cx - cols / 2);
    const y0 = Math.round(cy - rows.length / 2);
    const byChar = new Map<string, Mask>();
    const put = (ch: string, x: number, y: number) => {
      if (x < 0 || y < 0 || x >= size.w || y >= size.h) return;
      let m = byChar.get(ch);
      if (!m) byChar.set(ch, (m = emptyMask(size)));
      m[y * size.w + x] = 1;
    };
    rows.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === '.' || ch === ' ') return;
        if (!key[ch]) throw new Error(`штамп: символ «${ch}» не описан в key`);
        put(ch, x0 + i, y0 + j);
        // Unflipped mirror: the same pixels at the mirrored place (glints stay on one side).
        if (shape.mirror && flip === false) put(ch, axis2 - (x0 + cols) + i, y0 + j);
      }),
    );
    const [sx, sy] = (shape.stamp.shift ?? [0, 0]).map((e) => Math.round(num(e)));
    return [...byChar].map(([ch, m]) => {
      const [mat, t] = key[ch]!.split(':');
      return {
        mask: clip(shift(flip === false ? m : mirrored(m), size, sx!, sy!)),
        material: mat as Paint,
        tone: shape.tone ?? (t === undefined ? 2 : Number(t)),
        copy,
      };
    });
  }

  let mask: Mask;
  let tone: number | null = shape.tone ?? null;
  if ('ellipse' in shape) {
    const { at, r: radius, rot } = shape.ellipse;
    const [cx, cy] = P(at);
    const [rx, ry] = Array.isArray(radius) ? radius.map(num) : [num(radius), num(radius)];
    const pts = ellipsePoints(cx, cy, rx! * unit, ry! * unit, rot === undefined ? 0 : num(rot));
    mask = shape.hollow ? strokePath(size, pts, true) : fillPolygon(size, pts);
    if (shape.hollow) tone ??= 2;
  } else if ('poly' in shape) {
    const pts = shape.poly.map(P);
    mask = fillPolygon(size, shape.smooth ? smoothPath(pts, true) : pts);
  } else if ('strand' in shape) {
    const { from, to, bend, width } = shape.strand;
    mask = fillPolygon(size, strandPolygon(P(from), P(to), bend === undefined ? 0 : num(bend), num(width[0]) * unit, num(width[1]) * unit));
  } else {
    const pts = shape.stroke.map(P);
    const closed = shape.closed ?? false;
    mask = strokePath(size, shape.smooth ? smoothPath(pts, closed) : pts, closed);
    tone ??= 2; // a one-pixel line is all edge: shading and outlining would eat it
  }
  return [{ mask: clip(mirrored(mask)), material, tone, copy }];
}

interface Region {
  /** depth: later regions are in front */
  order: number;
  piece: string;
  material: Paint;
  part: Layer['part'];
  fixed: boolean;
  /** casts a shadow onto regions behind it */
  casts: boolean;
  /** everything the region covers, including what upper layers hide */
  mask: Mask;
}

/** The look in one frame: `bust` for cards, `full` for the standing figure. */
export function renderLook(look: Look, lib: PartLibrary, state: FigureState = {}, frame: Frame = 'bust'): Sprite {
  return crop(renderFigure(look, lib, state), FRAMES[frame]);
}

export function crop(s: Sprite, f: { x: number; y: number; w: number; h: number }): Sprite {
  const rgba = new Uint8ClampedArray(f.w * f.h * 4);
  for (let y = 0; y < f.h; y++) {
    const sy = y + f.y;
    if (sy < 0 || sy >= s.h) continue;
    for (let x = 0; x < f.w; x++) {
      const sx = x + f.x;
      if (sx < 0 || sx >= s.w) continue;
      rgba.set(s.rgba.subarray((sy * s.w + sx) * 4, (sy * s.w + sx) * 4 + 4), (y * f.w + x) * 4);
    }
  }
  return { w: f.w, h: f.h, rgba };
}

/** The whole standing figure on the SIZE canvas. */
export function renderFigure(look: Look, lib: PartLibrary, state: FigureState = {}): Sprite {
  const r = HEAD.r * look.head;
  const layers: Layer[] = resolveLook(look, lib, state).map((pl, pi) => ({
    ...pl,
    origin: [HEAD.cx, HEAD.cy],
    unit: r,
    where: `${pl.slot}/${pl.part.id}`,
    depth: (slot = pl.slot) => ({ key: `${pi}/${slot}`, z: SLOTS.indexOf(slot) * 1000 + (slot === pl.slot ? 0 : 500) + pi }),
  }));
  return paint(layers, SIZE, palette(look.palette), { cx: HEAD.cx, cy: HEAD.cy - 0.38 * r, rx: 0.8 * r, ry: 0.52 * r });
}

/**
 * Layers -> pixels: rasterise every shape, paint back to front, shade volumes, cast shadows,
 * the hair ring (where `ring` is given), the selective outline and the colours of `colors`.
 */
export function paint(layers: Layer[], size: Size, colors: Record<string, RGB[]>, ring?: { cx: number; cy: number; rx: number; ry: number }): Sprite {
  const { w, h } = size;
  const N = w * h;

  // 0. Named shapes first, so that any part can clip to any other.
  const names: Names = new Map();
  for (const layer of layers)
    for (const shape of layer.part.shapes) {
      if (!shape.name || !matches(shape.when, layer)) continue;
      const m = names.get(shape.name) ?? emptyMask(size);
      for (const frag of fragments({ ...shape, clip: undefined }, layer, names, size)) for (let p = 0; p < N; p++) m[p] = m[p]! | frag.mask[p]!;
      names.set(shape.name, m);
    }

  // 1. Rasterise. A piece is what one layer draws at one depth.
  interface Piece {
    z: number;
    reg: Int32Array;
    tone: Int8Array;
  }
  const pieces = new Map<string, Piece>();
  const regions: Region[] = [];
  const regionIds = new Map<string, number>();
  for (const layer of layers) {
    layer.part.shapes.forEach((shape, si) => {
      if (!matches(shape.when, layer)) return;
      const { key: pieceKey, z } = layer.depth('slot' in shape ? shape.slot : undefined);
      let piece = pieces.get(pieceKey);
      if (!piece) {
        piece = { z, reg: new Int32Array(N).fill(-1), tone: new Int8Array(N).fill(-1) };
        pieces.set(pieceKey, piece);
      }
      for (const frag of fragments(shape, layer, names, size)) {
        if (shape.erase) {
          for (let p = 0; p < N; p++) if (frag.mask[p]) piece.reg[p] = -1;
          continue;
        }
        const fixed = frag.tone !== null;
        const casts = !fixed && (shape.shadow ?? layer.part.shadow);
        const own = (shape.seam ?? layer.part.seams) ? `${si}.${frag.copy}` : '';
        const key = `${pieceKey}/${frag.material}/${fixed ? 'fixed' : own}/${casts ? 'casts' : ''}`;
        let id = regionIds.get(key);
        if (id === undefined) {
          id = regions.length;
          regions.push({ order: piece.z * 1000 + si, piece: pieceKey, material: frag.material, part: layer.part, fixed, casts, mask: emptyMask(size) });
          regionIds.set(key, id);
        }
        for (let p = 0; p < N; p++)
          if (frag.mask[p]) {
            piece.reg[p] = id;
            piece.tone[p] = frag.tone ?? -1;
          }
      }
    });
  }

  // 2. Paint back to front.
  const owner = new Int32Array(N).fill(-1);
  const tone = new Int8Array(N).fill(-1);
  for (const piece of [...pieces.values()].sort((a, b) => a.z - b.z)) {
    for (let p = 0; p < N; p++) {
      const id = piece.reg[p]!;
      if (id < 0) continue;
      regions[id]!.mask[p] = 1;
      owner[p] = id;
      tone[p] = piece.tone[p]!;
    }
  }
  const shaded = (p: number) => owner[p]! >= 0 && !regions[owner[p]!]!.fixed;
  for (let p = 0; p < N; p++) if (shaded(p)) tone[p] = 2;

  // 3. Volume: a shadow crescent away from the light, a rim of light toward it.
  // Off-canvas counts as inside: the body goes on below the frame.
  const inside = (m: Mask, x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || m[y * w + x] === 1;
  regions.forEach((reg, id) => {
    if (reg.fixed || reg.part.shade !== 'round') return;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let p = 0; p < N; p++)
      if (reg.mask[p]) {
        const x = p % w;
        const y = (p - x) / w;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    const k = Math.min(3, Math.max(1, Math.round(Math.min(x1 - x0 + 1, y1 - y0 + 1) * 0.12)));
    const [dx, dy] = SHADOW_DIR;
    for (let p = 0; p < N; p++) {
      if (owner[p] !== id) continue;
      const x = p % w;
      const y = (p - x) / w;
      if (!inside(reg.mask, x + dx * k, y + dy * k)) tone[p] = 1;
      else if (!inside(reg.mask, x - dx * 2, y - dy * 2)) tone[p] = 3;
    }
  });

  // 4. Cast shadows: a pixel is shaded when, toward the light, a caster lies in front of it.
  // `front` holds, per pixel, the depth of the front-most caster covering it (hidden or not).
  const front = new Float64Array(N).fill(-Infinity);
  for (const reg of regions)
    if (reg.casts) for (let p = 0; p < N; p++) if (reg.mask[p] && reg.order > front[p]!) front[p] = reg.order;
  const [ox, oy] = CAST_OFFSET;
  for (let p = 0; p < N; p++) {
    if (!shaded(p)) continue;
    const x = (p % w) - ox;
    const y = Math.floor(p / w) - oy;
    if (x < 0 || y < 0 || x >= w) continue;
    if (front[y * w + x]! > regions[owner[p]!]!.order) tone[p] = Math.min(tone[p]!, 1);
  }

  // 5. The glossy ring on hair: an arc around the crown, brightest in its middle.
  if (ring)
    for (let p = 0; p < N; p++) {
      if (!shaded(p) || tone[p]! < 2) continue;
      if (regions[owner[p]!]!.part.highlight !== 'hair_band') continue;
      const x = (p % w) + 0.5;
      const y = Math.floor(p / w) + 0.5;
      if (y > ring.cy) continue;
      const d = Math.hypot((x - ring.cx) / ring.rx, (y - ring.cy) / ring.ry);
      const px = Math.abs(d - 1) * ring.ry;
      if (px < 0.8) tone[p] = 4;
      else if (px < 1.9) tone[p] = 3;
    }

  // 6. Selective outline: the edge of a region against the void or against what lies behind.
  // Locks of the same part get a softer seam instead of a full line.
  const outlined = new Int8Array(tone);
  for (let p = 0; p < N; p++) {
    if (!shaded(p)) continue;
    const reg = regions[owner[p]!]!;
    if (!reg.part.outline) continue;
    const x = p % w;
    const y = (p - x) / w;
    let line = -1;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = owner[ny * w + nx]!;
      if (q < 0) {
        line = 0;
        break;
      }
      const other = regions[q]!;
      if (q === owner[p] || other.order > reg.order) continue;
      const seam = other.piece === reg.piece && other.material === reg.material;
      line = seam ? Math.max(line, 1) : 0;
      if (line === 0) break;
    }
    if (line >= 0) outlined[p] = Math.min(outlined[p]!, line);
  }

  // 7. Colours.
  const rgba = new Uint8ClampedArray(N * 4);
  for (let p = 0; p < N; p++) {
    if (owner[p]! < 0) continue;
    const m = regions[owner[p]!]!.material;
    const ramp = m.startsWith('#') ? undefined : colors[m];
    if (!m.startsWith('#') && !ramp) throw new Error(`нет цвета для материала ${m}`);
    const c = ramp ? ramp[outlined[p]!]! : parseHex(m);
    rgba.set([c[0], c[1], c[2], 255], p * 4);
  }
  return { w, h, rgba };
}

/**
 * Static checks of a part or a prop: params referenced exist, expressions evaluate, `when` is
 * valid. `globals` are the params every part sees without declaring them (the body's).
 */
export function partIssues(part: { params: Record<string, ParamDef>; shapes: AnyShape[] }, globals: Record<string, number> = { shoulders: 1, chest: 0.35 }): string[] {
  const issues: string[] = [];
  const nums: Record<string, number> = { ...globals };
  const enums: Record<string, string[]> = {};
  for (const [name, def] of Object.entries(part.params)) {
    if (name in globals) issues.push(`params.${name}: имя занято общим параметром тела`);
    if (name === 'i') issues.push('params.i: имя занято номером копии в repeat');
    if ('range' in def) {
      nums[name] = def.default;
      if (def.default < def.range[0] || def.default > def.range[1]) issues.push(`params.${name}: default вне диапазона`);
    } else {
      enums[name] = def.options;
      if (!def.options.includes(def.default)) issues.push(`params.${name}: default не из options`);
    }
  }
  part.shapes.forEach((shape, i) => {
    const where = `shapes[${i}]`;
    const vars = shape.repeat ? { ...nums, i: 0 } : nums;
    if (shape.cycle && !shape.repeat) issues.push(`${where}: cycle без repeat`);
    for (const e of shapeExprs(shape)) {
      for (const v of exprVars(e)) if (!(v in vars)) issues.push(`${where}: $${v} не объявлен как числовой параметр`);
      try {
        evalExpr(e, vars);
      } catch (err) {
        issues.push(`${where}: ${(err as Error).message}`);
      }
    }
    for (const [k, v] of Object.entries(shape.when ?? {})) {
      if (typeof v === 'object' && !Array.isArray(v)) {
        if (!(k in nums)) issues.push(`${where}.when: ${k} не объявлен как числовой параметр`);
      } else if (!enums[k]) issues.push(`${where}.when: ${k} не объявлен как параметр с options`);
      else for (const opt of Array.isArray(v) ? v : [v]) if (!enums[k].includes(opt)) issues.push(`${where}.when.${k}: нет варианта ${opt}`);
    }
    if (shape.name && shape.clip) issues.push(`${where}: фигура с name не может сама иметь clip`);
    if ('stamp' in shape)
      for (const row of shape.stamp.rows)
        for (const ch of row) if (ch !== '.' && ch !== ' ' && !shape.stamp.key[ch]) issues.push(`${where}: символ «${ch}» не описан в key`);
  });
  return issues;
}

/** Params a part of this slot lacks to follow the rig (style.ts, RIG). */
export function rigIssues(slot: Slot, part: Part): string[] {
  const issues: string[] = [];
  for (const [name, need] of Object.entries(RIG[slot] ?? {})) {
    const def = part.params[name];
    if (need === 'number') {
      if (!def || !('range' in def)) issues.push(`риг ${slot}: нужен числовой параметр ${name}`);
    } else if (!def || !('options' in def)) issues.push(`риг ${slot}: нужен параметр ${name} с вариантами ${need.join(', ')}`);
    else {
      const missing = need.filter((o) => !def.options.includes(o));
      if (missing.length) issues.push(`риг ${slot}: у ${name} нет вариантов ${missing.join(', ')}`);
    }
  }
  return issues;
}

/** Problems of a look against the library, for the base look, every emotion and animation. */
export function lookIssues(look: Look, lib: PartLibrary): string[] {
  const issues: string[] = [];
  for (const emotion of [undefined, ...emotionsOf(look)]) {
    resolveLook(look, lib, { emotion }, issues);
    for (const name of Object.keys(ANIMATIONS)) {
      try {
        for (const f of animationFrames(look, lib, name, emotion)) resolveLook(look, lib, { emotion, overlay: f.overlay, globals: f.globals }, issues);
      } catch (e) {
        issues.push((e as Error).message);
      }
    }
  }
  return [...new Set(issues)];
}
