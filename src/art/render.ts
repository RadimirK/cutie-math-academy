// Look + part library -> pixels. Deterministic and DOM-free: the same YAML always gives the
// same sprite, in the browser and in CI.
//
// Pipeline: resolve the emotion's overrides -> rasterise every shape into masks -> paint the
// parts back to front -> shade volumes -> cast shadows of upper layers -> hair highlight ->
// selective outline -> colours from the palette's ramps.
import { evalExpr, exprVars, type Expr } from './expr.ts';
import {
  ellipsePoints,
  emptyMask,
  fillPolygon,
  flipX,
  shift,
  smoothPath,
  strandPolygon,
  strokePath,
  type Mask,
  type Pt,
} from './raster.ts';
import { SLOTS, type Look, type Material, type Part, type PartUse, type Shape, type Slot } from './schema.ts';
import { CAST_SHADOWS, DEFAULT_PARTS, HEAD, SHADOW_DIR, SIZE, palette } from './style.ts';

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

/** Body measurements every part can refer to, as `$name`. */
export const GLOBAL_PARAMS = ['shoulders'] as const;
const globals = (look: Look): Record<string, number> => ({ shoulders: look.shoulders });

function place(slot: Slot, use: PartUse, lib: PartLibrary, look: Look): Placed {
  const part = lib[slot]?.[use.part];
  if (!part) throw new Error(`${slot}: нет детали ${use.part} (есть: ${Object.keys(lib[slot] ?? {}).join(', ') || 'ничего'})`);
  const nums: Record<string, number> = globals(look);
  const enums: Record<string, string> = {};
  for (const [name, def] of Object.entries(part.params)) {
    if ('range' in def) nums[name] = def.default;
    else enums[name] = def.default;
  }
  for (const [name, value] of Object.entries(use)) {
    if (name === 'part') continue;
    const def = part.params[name];
    const where = `${slot}.${name}`;
    if (!def) throw new Error(`${where}: у детали ${part.id} нет параметра ${name} (есть: ${Object.keys(part.params).join(', ') || 'нет'})`);
    if ('range' in def) {
      if (typeof value !== 'number') throw new Error(`${where}: нужно число`);
      const [lo, hi] = def.range;
      if (value < lo || value > hi) throw new Error(`${where}: ${value} вне диапазона [${lo}, ${hi}]`);
      if (def.int && !Number.isInteger(value)) throw new Error(`${where}: нужно целое число`);
      nums[name] = value;
    } else {
      if (typeof value !== 'string' || !def.options.includes(value))
        throw new Error(`${where}: «${value}» не из вариантов ${def.options.join(', ')}`);
      enums[name] = value;
    }
  }
  return { slot, part, nums, enums };
}

/**
 * The look with an emotion applied: what to draw, in slot order. Throws on the first problem,
 * or collects every problem into `issues` and skips the slots that have one.
 */
export function resolveLook(look: Look, lib: PartLibrary, emotion?: string, issues?: string[]): Placed[] {
  const over = (emotion && look.emotions[emotion]) || {};
  const out: Placed[] = [];
  for (const slot of SLOTS) {
    try {
      out.push(...resolveSlot(look, lib, slot, over[slot], emotion));
    } catch (e) {
      if (!issues) throw e;
      issues.push((e as Error).message);
    }
  }
  return out;
}

function resolveSlot(look: Look, lib: PartLibrary, slot: Slot, o: Look['emotions'][string][Slot], emotion?: string): Placed[] {
  const base = look.parts[slot] ?? (DEFAULT_PARTS[slot] ? { part: DEFAULT_PARTS[slot] } : undefined);
  let uses: PartUse[] = base ? (Array.isArray(base) ? base : [base]) : [];
  if (o) {
    if (uses.length > 1) throw new Error(`эмоция ${emotion}: в слоте ${slot} несколько деталей, его нельзя переопределять`);
    // Another part starts from its own defaults; the same part keeps the base params.
    const merged = o.part && o.part !== uses[0]?.part ? { ...o } : { ...uses[0], ...o };
    if (!merged.part) throw new Error(`эмоция ${emotion}: в слоте ${slot} нет детали, укажите part`);
    uses = [merged as PartUse];
  }
  return uses.filter((use) => use.part !== NO_PART).map((use) => place(slot, use, lib, look));
}

const matches = (when: Shape['when'], enums: Record<string, string>) =>
  !when || Object.entries(when).every(([k, v]) => (Array.isArray(v) ? v.includes(enums[k]!) : enums[k] === v));

interface Fragment {
  mask: Mask;
  material: Material;
  /** fixed tone, or null for shaded pixels */
  tone: number | null;
}

/** Every expression a shape contains (for validation). */
export function shapeExprs(shape: Shape): Expr[] {
  const pts = (ps: [Expr, Expr][]) => ps.flat();
  if ('ellipse' in shape) {
    const { at, r, rot } = shape.ellipse;
    return [...at, ...(Array.isArray(r) ? r : [r]), ...(rot === undefined ? [] : [rot])];
  }
  if ('poly' in shape) return pts(shape.poly);
  if ('strand' in shape) {
    const { from, to, bend, width } = shape.strand;
    return [...from, ...to, ...width, ...(bend === undefined ? [] : [bend])];
  }
  if ('stroke' in shape) return pts(shape.stroke);
  return [...shape.stamp.at, ...(shape.stamp.shift ?? [])];
}

function fragments(shape: Shape, pl: Placed, r: number): Fragment[] {
  const size = SIZE;
  const num = (e: Expr) => evalExpr(e, pl.nums);
  const P = ([x, y]: [Expr, Expr]): Pt => [HEAD.cx + num(x) * r, HEAD.cy + num(y) * r];
  const material = shape.material ?? pl.part.material;
  const mirrored = (m: Mask) => {
    if (!shape.mirror) return m;
    const f = flipX(m, size);
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
        if (shape.mirror && flip === false) put(ch, size.w - (x0 + cols) + i, y0 + j);
      }),
    );
    const [sx, sy] = (shape.stamp.shift ?? [0, 0]).map((e) => Math.round(num(e)));
    return [...byChar].map(([ch, m]) => {
      const [mat, t] = key[ch]!.split(':');
      return {
        mask: shift(flip === false ? m : mirrored(m), size, sx!, sy!),
        material: mat as Material,
        tone: shape.tone ?? (t === undefined ? 2 : Number(t)),
      };
    });
  }

  let mask: Mask;
  let tone: number | null = shape.tone ?? null;
  if ('ellipse' in shape) {
    const { at, r: radius, rot } = shape.ellipse;
    const [cx, cy] = P(at);
    const [rx, ry] = Array.isArray(radius) ? radius.map(num) : [num(radius), num(radius)];
    const pts = ellipsePoints(cx, cy, rx! * r, ry! * r, rot === undefined ? 0 : num(rot));
    mask = shape.hollow ? strokePath(size, pts, true) : fillPolygon(size, pts);
    if (shape.hollow) tone ??= 2;
  } else if ('poly' in shape) {
    const pts = shape.poly.map(P);
    mask = fillPolygon(size, shape.smooth ? smoothPath(pts, true) : pts);
  } else if ('strand' in shape) {
    const { from, to, bend, width } = shape.strand;
    mask = fillPolygon(size, strandPolygon(P(from), P(to), bend === undefined ? 0 : num(bend), num(width[0]) * r, num(width[1]) * r));
  } else {
    const pts = shape.stroke.map(P);
    const closed = shape.closed ?? false;
    mask = strokePath(size, shape.smooth ? smoothPath(pts, closed) : pts, closed);
    tone ??= 2; // a one-pixel line is all edge: shading and outlining would eat it
  }
  return [{ mask: mirrored(mask), material, tone }];
}

interface Region {
  /** depth: later regions are in front */
  order: number;
  slot: Slot;
  piece: string;
  material: Material;
  part: Part;
  fixed: boolean;
  /** everything the region covers, including what upper layers hide */
  mask: Mask;
}

export function renderLook(look: Look, lib: PartLibrary, emotion?: string): Sprite {
  const { w, h } = SIZE;
  const N = w * h;
  const r = HEAD.r * look.head;
  const placed = resolveLook(look, lib, emotion);

  // 1. Rasterise. A piece is what one placed part draws at one depth.
  interface Piece {
    z: number;
    reg: Int32Array;
    tone: Int8Array;
  }
  const pieces = new Map<string, Piece>();
  const regions: Region[] = [];
  const regionIds = new Map<string, number>();
  placed.forEach((pl, pi) => {
    pl.part.shapes.forEach((shape, si) => {
      if (!matches(shape.when, pl.enums)) return;
      const slot = shape.slot ?? pl.slot;
      const pieceKey = `${pi}/${slot}`;
      let piece = pieces.get(pieceKey);
      if (!piece) {
        piece = { z: SLOTS.indexOf(slot) * 1000 + (slot === pl.slot ? 0 : 500) + pi, reg: new Int32Array(N).fill(-1), tone: new Int8Array(N).fill(-1) };
        pieces.set(pieceKey, piece);
      }
      for (const frag of fragments(shape, pl, r)) {
        if (shape.erase) {
          for (let p = 0; p < N; p++) if (frag.mask[p]) piece.reg[p] = -1;
          continue;
        }
        const fixed = frag.tone !== null;
        const key = `${pieceKey}/${frag.material}/${fixed ? 'fixed' : (shape.seam ?? pl.part.seams) ? si : ''}`;
        let id = regionIds.get(key);
        if (id === undefined) {
          id = regions.length;
          regions.push({ order: piece.z * 1000 + si, slot, piece: pieceKey, material: frag.material, part: pl.part, fixed, mask: emptyMask(SIZE) });
          regionIds.set(key, id);
        }
        for (let p = 0; p < N; p++)
          if (frag.mask[p]) {
            piece.reg[p] = id;
            piece.tone[p] = frag.tone ?? -1;
          }
      }
    });
  });

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

  // 4. Shadows cast by upper layers.
  for (const rule of CAST_SHADOWS) {
    const caster = emptyMask(SIZE);
    for (const reg of regions) if (rule.from.includes(reg.slot)) for (let p = 0; p < N; p++) caster[p] = caster[p]! | reg.mask[p]!;
    const cast = shift(caster, SIZE, rule.offset[0], rule.offset[1]);
    for (let p = 0; p < N; p++) {
      if (!cast[p] || !shaded(p)) continue;
      const reg = regions[owner[p]!]!;
      if (rule.onto.includes(reg.slot) && !rule.from.includes(reg.slot)) tone[p] = Math.min(tone[p]!, 1);
    }
  }

  // 5. The glossy ring on hair: an arc around the crown, brightest in its middle.
  const ring = { cx: HEAD.cx, cy: HEAD.cy - 0.38 * r, rx: 0.8 * r, ry: 0.52 * r };
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
  const colors = palette(look.palette);
  const rgba = new Uint8ClampedArray(N * 4);
  for (let p = 0; p < N; p++) {
    if (owner[p]! < 0) continue;
    const c = colors[regions[owner[p]!]!.material][outlined[p]!]!;
    rgba.set([c[0], c[1], c[2], 255], p * 4);
  }
  return { w, h, rgba };
}

/** Static checks of a part: params referenced exist, expressions evaluate, `when` is valid. */
export function partIssues(part: Part): string[] {
  const issues: string[] = [];
  const nums: Record<string, number> = { shoulders: 1 };
  const enums: Record<string, string[]> = {};
  for (const [name, def] of Object.entries(part.params)) {
    if ((GLOBAL_PARAMS as readonly string[]).includes(name)) issues.push(`params.${name}: имя занято общим параметром тела`);
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
    for (const e of shapeExprs(shape)) {
      for (const v of exprVars(e)) if (!(v in nums)) issues.push(`${where}: $${v} не объявлен как числовой параметр`);
      try {
        evalExpr(e, nums);
      } catch (err) {
        issues.push(`${where}: ${(err as Error).message}`);
      }
    }
    for (const [k, v] of Object.entries(shape.when ?? {})) {
      if (!enums[k]) issues.push(`${where}.when: ${k} не объявлен как параметр с options`);
      else for (const opt of Array.isArray(v) ? v : [v]) if (!enums[k].includes(opt)) issues.push(`${where}.when.${k}: нет варианта ${opt}`);
    }
    if ('stamp' in shape)
      for (const row of shape.stamp.rows)
        for (const ch of row) if (ch !== '.' && ch !== ' ' && !shape.stamp.key[ch]) issues.push(`${where}: символ «${ch}» не описан в key`);
  });
  return issues;
}

/** Problems of a look against the library, for the base look and every emotion. */
export function lookIssues(look: Look, lib: PartLibrary): string[] {
  const issues: string[] = [];
  for (const emotion of [undefined, ...Object.keys(look.emotions)]) resolveLook(look, lib, emotion, issues);
  return [...new Set(issues)];
}
