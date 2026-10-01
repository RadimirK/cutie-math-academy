// Rasterisation into 1-bit masks at the sprite's native resolution. Coordinates here are
// pixels: pixel (i, j) covers [i, i+1) × [j, j+1) and its centre is (i + 0.5, j + 0.5).

export type Pt = [number, number];

export interface Size {
  w: number;
  h: number;
}

export type Mask = Uint8Array;

export const emptyMask = ({ w, h }: Size): Mask => new Uint8Array(w * h);

/** Subsamples per pixel side for filled shapes; a pixel is set when at least half is covered. */
const SS = 4;

/** Fills a closed polygon (even-odd rule). */
export function fillPolygon(size: Size, pts: Pt[]): Mask {
  const { w, h } = size;
  const cover = new Uint16Array(w * h);
  const n = pts.length;
  if (n < 3) return emptyMask(size);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const rowFrom = Math.max(0, Math.floor(minY * SS));
  const rowTo = Math.min(h * SS - 1, Math.ceil(maxY * SS));
  const xs: number[] = [];
  for (let row = rowFrom; row <= rowTo; row++) {
    const y = (row + 0.5) / SS;
    xs.length = 0;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pts[i]!;
      const [x2, y2] = pts[(i + 1) % n]!;
      if (y1 <= y !== y2 <= y) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    const py = Math.floor(row / SS);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      // subsample columns whose centres lie inside [xs[k], xs[k+1])
      const c0 = Math.max(0, Math.ceil(xs[k]! * SS - 0.5));
      const c1 = Math.min(w * SS - 1, Math.ceil(xs[k + 1]! * SS - 0.5) - 1);
      for (let c = c0; c <= c1; c++) cover[py * w + Math.floor(c / SS)]!++;
    }
  }
  const out = emptyMask(size);
  const half = (SS * SS) / 2;
  for (let i = 0; i < out.length; i++) out[i] = cover[i]! >= half ? 1 : 0;
  return out;
}

/**
 * A one-pixel line through the points, made "pixel perfect": no doubled corners where
 * the line turns, which is what makes hand-drawn pixel lines look clean.
 */
export function strokePath(size: Size, pts: Pt[], closed: boolean): Mask {
  const path: Pt[] = [];
  const push = (x: number, y: number) => {
    const last = path[path.length - 1];
    if (!last || last[0] !== x || last[1] !== y) path.push([x, y]);
  };
  const segs = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < segs; i++) {
    const [ax, ay] = pts[i]!;
    const [bx, by] = pts[(i + 1) % pts.length]!;
    let x0 = Math.floor(ax);
    let y0 = Math.floor(ay);
    const x1 = Math.floor(bx);
    const y1 = Math.floor(by);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      push(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  // Drop the elbow pixel of every L-shaped triple.
  const clean: Pt[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = clean[clean.length - 1];
    const b = path[i]!;
    const c = path[i + 1];
    if (a && c && Math.abs(a[0] - c[0]) === 1 && Math.abs(a[1] - c[1]) === 1 && (a[0] === b[0] || a[1] === b[1])) continue;
    clean.push(b);
  }
  const out = emptyMask(size);
  for (const [x, y] of clean) if (x >= 0 && y >= 0 && x < size.w && y < size.h) out[y * size.w + x] = 1;
  return out;
}

/** Points of a closed Catmull-Rom spline through `pts` (or an open one through its ends). */
export function smoothPath(pts: Pt[], closed: boolean, perSegment = 10): Pt[] {
  const n = pts.length;
  if (n < 3) return pts;
  const at = (i: number): Pt => (closed ? pts[(i + n) % n]! : pts[Math.min(n - 1, Math.max(0, i))]!);
  const out: Pt[] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[n - 1]!);
  return out;
}

export function ellipsePoints(cx: number, cy: number, rx: number, ry: number, rotDeg = 0, n = 48): Pt[] {
  const r = (rotDeg * Math.PI) / 180;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    const x = rx * Math.cos(a);
    const y = ry * Math.sin(a);
    out.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return out;
}

/**
 * Outline of a hair lock: a quadratic curve from `a` to `b` bowed sideways by `bend`
 * (a fraction of its length; positive bows to the right of the direction of travel),
 * with the width tapering linearly from `w0` at the root to `w1` at the tip.
 */
export function strandPolygon(a: Pt, b: Pt, bend: number, w0: number, w1: number, n = 16): Pt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const c: Pt = [(a[0] + b[0]) / 2 - nx * bend * len, (a[1] + b[1]) / 2 - ny * bend * len];
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * a[0] + 2 * u * t * c[0] + t * t * b[0];
    const y = u * u * a[1] + 2 * u * t * c[1] + t * t * b[1];
    // tangent
    let tx = 2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
    let ty = 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const hw = (w0 + (w1 - w0) * t) / 2;
    left.push([x - ty * hw, y + tx * hw]);
    right.push([x + ty * hw, y - tx * hw]);
  }
  return [...left, ...right.reverse()];
}

export function flipX(m: Mask, { w, h }: Size): Mask {
  const out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = m[y * w + (w - 1 - x)]!;
  return out;
}

/** Grows the mask by `n` pixels (4-neighbourhood per step), or shrinks it for negative `n`. */
export function dilate(m: Mask, { w, h }: Size, n: number): Mask {
  let cur = m;
  for (let step = 0; step < Math.abs(n); step++) {
    const grow = n > 0;
    const out = new Uint8Array(cur);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (cur[p] === (grow ? 1 : 0)) continue;
        const near =
          (x > 0 && cur[p - 1] === (grow ? 1 : 0)) ||
          (x < w - 1 && cur[p + 1] === (grow ? 1 : 0)) ||
          (y > 0 && cur[p - w] === (grow ? 1 : 0)) ||
          (y < h - 1 && cur[p + w] === (grow ? 1 : 0));
        if (near) out[p] = grow ? 1 : 0;
      }
    cur = out;
  }
  return cur;
}

export function shift(m: Mask, { w, h }: Size, dx: number, dy: number): Mask {
  const out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= h) continue;
    for (let x = 0; x < w; x++) {
      const sx = x - dx;
      if (sx >= 0 && sx < w) out[y * w + x] = m[sy * w + sx]!;
    }
  }
  return out;
}

export function bbox(m: Mask, { w, h }: Size): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (m[y * w + x]) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}
