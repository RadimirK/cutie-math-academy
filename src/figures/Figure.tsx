// Views of the figure plugins: plain SVG in the app's palette. Props are validated in ./core.ts.
import { useId, useState, type ComponentType, type ReactNode } from 'react';
import { cubeDim, lastOutside, parseFigure, sequenceValues, vennRegions, vennShaded, type CubeProps, type RelationProps, type SequenceProps, type VennProps } from './core.ts';

/** Renders a figure spec, or the validation error in place of the picture. */
export function Figure({ spec, className = '' }: { spec: unknown; className?: string }) {
  const r = parseFigure(spec);
  if (!r.ok) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">Рисунок не построен: {r.error}</p>;
  const View = views[r.type]!;
  return (
    <div className={className}>
      <View {...r.props} />
    </div>
  );
}

function Svg({ w, h, label, children }: { w: number; h: number; label: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto block h-auto w-full" style={{ maxWidth: w * 1.5 }} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

const nameFont = { fontFamily: 'KaTeX_Math, "Times New Roman", serif', fontStyle: 'italic' } as const;

// ---------- venn ----------

const VENN = {
  2: {
    w: 320,
    h: 200,
    circles: [[125, 100], [195, 100]],
    r: 70,
    names: [[58, 36], [262, 36]],
    anchors: { 1: [90, 100], 3: [160, 100], 2: [230, 100], 0: [36, 178] } as Record<number, [number, number]>,
  },
  3: {
    w: 320,
    h: 250,
    circles: [[130, 100], [190, 100], [160, 152]],
    r: 62,
    names: [[66, 40], [254, 40], [238, 214]],
    anchors: { 1: [104, 86], 2: [216, 86], 4: [160, 186], 3: [160, 76], 5: [127, 140], 6: [193, 140], 7: [160, 120], 0: [36, 228] } as Record<number, [number, number]>,
  },
} as const;

function Venn(p: VennProps) {
  const id = useId().replace(/:/g, '');
  const L = VENN[p.sets.length as 2 | 3];
  const shaded = vennShaded(p);
  const keys = vennRegions(p.sets);
  const box = { x: 10, y: 10, width: L.w - 20, height: L.h - 20 };
  const region = (mask: number) => {
    let el: ReactNode = <rect {...box} mask={`url(#${id}m${mask})`} className="fill-ba-300/70" />;
    L.circles.forEach((_, i) => {
      if (mask & (1 << i)) el = <g clipPath={`url(#${id}c${i})`}>{el}</g>;
    });
    return <g key={mask}>{el}</g>;
  };
  return (
    <Svg w={L.w} h={L.h} label={`диаграмма Венна для ${p.sets.join(', ')}`}>
      <defs>
        {L.circles.map(([cx, cy], i) => (
          <clipPath key={i} id={`${id}c${i}`}>
            <circle cx={cx} cy={cy} r={L.r} />
          </clipPath>
        ))}
        {keys.map((_, mask) => (
          <mask key={mask} id={`${id}m${mask}`}>
            <rect {...box} fill="white" />
            {L.circles.map(([cx, cy], i) => !(mask & (1 << i)) && <circle key={i} cx={cx} cy={cy} r={L.r} fill="black" />)}
          </mask>
        ))}
      </defs>
      <rect {...box} rx={8} className="fill-white stroke-ink-300" strokeWidth={1.5} />
      {keys.map((k, mask) => shaded.has(k) && region(mask))}
      {L.circles.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={L.r} fill="none" className="stroke-ink-700" strokeWidth={2} />
      ))}
      {p.sets.map((name, i) => (
        <text key={name} x={L.names[i]![0]} y={L.names[i]![1]} textAnchor="middle" dominantBaseline="middle" fontSize={20} className="fill-ink-900" style={nameFont}>
          {name}
        </text>
      ))}
      <text x={L.w - 24} y={28} textAnchor="middle" dominantBaseline="middle" fontSize={16} className="fill-ink-500" style={nameFont}>
        {p.universe}
      </text>
      {keys.map((k, mask) => {
        const els = p.elements[k];
        if (!els?.length) return null;
        const [x, y] = L.anchors[mask]!;
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={14} className="fill-ink-900 font-bold">
            {els.join(', ')}
          </text>
        );
      })}
    </Svg>
  );
}

// ---------- relation ----------

function Relation(p: RelationProps) {
  const id = useId().replace(/:/g, '');
  const n = p.nodes.length;
  const S = 260;
  const c = S / 2;
  const R = n === 1 ? 0 : n <= 3 ? 72 : 88;
  const nr = 17;
  const pos = new Map(p.nodes.map((v, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n + (n === 2 ? Math.PI / 2 : 0);
    return [v, [c + R * Math.cos(a), c + R * Math.sin(a)] as const];
  }));
  const has = new Set(p.edges.map(([a, b]) => `${a}>${b}`));
  const unit = (dx: number, dy: number) => {
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l] as const;
  };
  const edges = [...has].map((key) => {
    const [a, b] = key.split('>') as [string, string];
    const [ax, ay] = pos.get(a)!;
    if (a === b) {
      // A loop pointing away from the centre.
      const [ux, uy] = n === 1 ? [0, -1] : unit(ax - c, ay - c);
      const rot = (t: number, r: number) => [ax + r * (ux * Math.cos(t) - uy * Math.sin(t)), ay + r * (ux * Math.sin(t) + uy * Math.cos(t))];
      const [x1, y1] = rot(-0.55, nr);
      const [c1x, c1y] = rot(-0.75, nr + 34);
      const [c2x, c2y] = rot(0.75, nr + 34);
      const [x2, y2] = rot(0.55, nr + 3);
      return <path key={key} d={`M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`} />;
    }
    const [bx, by] = pos.get(b)!;
    // A pair of opposite arrows is drawn as two arcs.
    const bend = has.has(`${b}>${a}`) ? 22 : 0;
    const [dx, dy] = unit(bx - ax, by - ay);
    const qx = (ax + bx) / 2 - dy * bend;
    const qy = (ay + by) / 2 + dx * bend;
    const [sx, sy] = unit(qx - ax, qy - ay);
    const [ex, ey] = unit(qx - bx, qy - by);
    return <path key={key} d={`M${ax + sx * nr},${ay + sy * nr} Q${qx},${qy} ${bx + ex * (nr + 3)},${by + ey * (nr + 3)}`} />;
  });
  return (
    <Svg w={S} h={S} label={`граф отношения на {${p.nodes.join(', ')}}`}>
      <defs>
        <marker id={`${id}a`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={9} markerHeight={9} markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="fill-ink-700" />
        </marker>
      </defs>
      <g fill="none" className="stroke-ink-700" strokeWidth={1.8} markerEnd={`url(#${id}a)`}>
        {edges}
      </g>
      {p.nodes.map((v) => {
        const [x, y] = pos.get(v)!;
        return (
          <g key={v}>
            <circle cx={x} cy={y} r={nr} className="fill-white stroke-ba-500" strokeWidth={2.5} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={16} className="fill-ink-900 font-bold">
              {v}
            </text>
          </g>
        );
      })}
    </Svg>
  );
}

// ---------- cube ----------

function Cube(p: CubeProps) {
  const n = cubeDim(p)!;
  const layers: number[][] = Array.from({ length: n + 1 }, () => []);
  for (let v = (1 << n) - 1; v >= 0; v--) layers[popcount(v)]!.push(v);
  const bw = 12 + n * 10;
  const gap = 62;
  const w = Math.max(...layers.map((l) => l.length)) * gap + 20;
  const dy = n <= 2 ? 64 : 56;
  const h = n * dy + 50;
  const pos = new Map<number, [number, number]>();
  layers.forEach((layer, k) =>
    layer.forEach((v, j) => pos.set(v, [w / 2 + (j - (layer.length - 1) / 2) * gap, h - 25 - k * dy])),
  );
  const bits = (v: number) => v.toString(2).padStart(n, '0');
  const highlight = new Set(p.highlight);
  const edges: ReactNode[] = [];
  for (let v = 0; v < 1 << n; v++)
    for (let b = 0; b < n; b++)
      if (!(v & (1 << b))) {
        const [x1, y1] = pos.get(v)!;
        const [x2, y2] = pos.get(v | (1 << b))!;
        edges.push(<line key={`${v}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} />);
      }
  return (
    <Svg w={w} h={h} label={`булев куб размерности ${n}`}>
      <g className="stroke-ink-300" strokeWidth={1.5}>
        {edges}
      </g>
      {[...pos].map(([v, [x, y]]) => {
        const one = p.values?.[v] === '1';
        return (
          <g key={v}>
            {highlight.has(bits(v)) && <rect x={x - bw / 2 - 5} y={y - 16} width={bw + 10} height={32} rx={16} className="fill-gold-300 stroke-gold-500" strokeWidth={1.5} />}
            <rect x={x - bw / 2} y={y - 11} width={bw} height={22} rx={11} className={one ? 'fill-ba-500 stroke-ba-600' : 'fill-white stroke-ink-500'} strokeWidth={1.5} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={13} className={`font-mono font-bold ${one ? 'fill-white' : 'fill-ink-700'}`}>
              {bits(v)}
            </text>
          </g>
        );
      })}
    </Svg>
  );
}

function popcount(v: number): number {
  let c = 0;
  for (; v; v &= v - 1) c++;
  return c;
}

// ---------- sequence ----------

/** 0.5 -> "0,5", -1 -> "−1": Russian decimal comma and a real minus sign. */
const fmt = (v: number) => String(Number(v.toPrecision(3))).replace('.', ',').replace('-', '−');

function niceStep(range: number): number {
  const raw = range / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= raw) ?? 10) * p;
}

function Sequence(p: SequenceProps) {
  const values = sequenceValues(p);
  const [eps, setEps] = useState(p.eps ?? Math.max(...values.map((v) => Math.abs(v - (p.limit ?? 0))), 1e-9) / 2);
  const showStrip = p.limit !== undefined && (p.eps !== undefined || p.interactive);
  const W = 380;
  const H = 230;
  const left = 46;
  const right = 14;
  const top = 14;
  const bottom = 30;
  const ys = [...values, ...(p.limit !== undefined ? [p.limit] : [])];
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  if (hi - lo < 1e-9) [lo, hi] = [lo - 1, hi + 1];
  const step = niceStep(hi - lo);
  lo = Math.floor(lo / step - 0.25) * step;
  hi = Math.ceil(hi / step + 0.25) * step;
  const count = values.length;
  const X = (n: number) => left + ((n - 0.5) / count) * (W - left - right);
  const Y = (v: number) => top + ((hi - v) / (hi - lo)) * (H - top - bottom);
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.abs(t) < step / 1e6 ? 0 : t);
  const nTicks = values.map((_, k) => k + 1).filter((n) => n === 1 || n % (count > 30 ? 10 : count > 12 ? 5 : 2) === 0);
  const N = p.limit !== undefined ? lastOutside(values, p.limit, eps) : 0;
  const clampY = (v: number) => Math.min(H - bottom, Math.max(top, Y(v)));
  // The slider moves ε on a log scale over three orders of magnitude.
  const maxEps = hi - lo;
  const minEps = maxEps / 1000;

  return (
    <div>
      <Svg w={W} h={H} label={`график первых ${count} членов последовательности ${p.label}_n`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={Y(t)} y2={Y(t)} className={t === 0 ? 'stroke-ink-500' : 'stroke-ink-100'} strokeWidth={t === 0 ? 1.5 : 1} />
            <text x={left - 6} y={Y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} className="fill-ink-500">
              {fmt(t)}
            </text>
          </g>
        ))}
        {nTicks.map((n) => (
          <text key={n} x={X(n)} y={H - bottom + 16} textAnchor="middle" fontSize={11} className="fill-ink-500">
            {n}
          </text>
        ))}
        <text x={W - right} y={H - 2} textAnchor="end" fontSize={12} className="fill-ink-500" style={nameFont}>
          n
        </text>
        {showStrip && (
          <rect x={left} width={W - left - right} y={clampY(p.limit! + eps)} height={clampY(p.limit! - eps) - clampY(p.limit! + eps)} className="fill-gold-300/40" />
        )}
        {p.limit !== undefined && <line x1={left} x2={W - right} y1={Y(p.limit)} y2={Y(p.limit)} strokeDasharray="6 4" className="stroke-momo-400" strokeWidth={1.5} />}
        {p.interactive && N > 0 && N < count && (
          <g>
            <line x1={(X(N) + X(N + 1)) / 2} x2={(X(N) + X(N + 1)) / 2} y1={top} y2={H - bottom} strokeDasharray="3 3" className="stroke-ink-500" />
            <text x={(X(N) + X(N + 1)) / 2 + 4} y={top + 10} fontSize={12} className="fill-ink-700 font-bold">
              N = {N}
            </text>
          </g>
        )}
        {values.map((v, k) => (
          <circle
            key={k}
            cx={X(k + 1)}
            cy={Y(v)}
            r={count > 30 ? 2.8 : 4}
            className={p.interactive && Math.abs(v - p.limit!) >= eps ? 'fill-momo-500' : 'fill-ba-500'}
          />
        ))}
      </Svg>
      {p.interactive && (
        // Stop clicks here from advancing the scene.
        <label className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-ink-700" onClick={(e) => e.stopPropagation()}>
          <span className="w-24 shrink-0 font-mono">ε = {fmt(eps)}</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round((Math.log(eps / minEps) / Math.log(maxEps / minEps)) * 1000)}
            onChange={(e) => setEps(minEps * (maxEps / minEps) ** (Number(e.target.value) / 1000))}
            className="min-w-0 flex-1 accent-ba-500"
          />
          <span className="w-full text-ink-500 sm:w-auto sm:shrink-0">{N >= count ? `N ≥ ${count}, за краем графика` : N === 0 ? 'все в полосе' : `вне полосы до n = ${N}`}</span>
        </label>
      )}
    </div>
  );
}

const views: Record<string, ComponentType<any>> = { venn: Venn, relation: Relation, cube: Cube, sequence: Sequence };
