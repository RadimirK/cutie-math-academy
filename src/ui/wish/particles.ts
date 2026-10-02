// Canvas particle field for the recruitment animation: a vortex of math glyphs, spark bursts,
// card shards and rising sparkles. Framework-free; the overlay drives it imperatively.

const GLYPHS = ['∑', '∫', '∀', '∃', 'π', '∞', '⊕', 'λ', '∂', '√', '≡', '∧', '∨', '¬', 'ε', 'δ', '∈', '⊆', 'ℕ', 'ℤ', 'Δ', 'φ', '→', '∮'];

type Kind = 'glyph' | 'spark' | 'shard' | 'sparkle' | 'ring';

interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
  glyph?: string;
  /** vortex particles orbit the centre: polar coordinates */
  angle?: number;
  radius?: number;
}

const MAX = 900;
/** How far a ring's glow reaches beyond its stroke, px (what shadowBlur 30 used to give). */
const RING_GLOW = 30;

const alphaCache = new Map<string, string>();
/** '#rrggbb' -> 'rgb(r g b / a)'. */
function withAlpha(hex: string, a: number): string {
  const key = hex + a;
  let s = alphaCache.get(key);
  if (!s) {
    const n = parseInt(hex.slice(1), 16);
    s = `rgb(${n >> 16} ${(n >> 8) & 255} ${n & 255} / ${a})`;
    alphaCache.set(key, s);
  }
  return s;
}

// Glowing glyphs and sparkles are pre-rendered once per (shape, colour): shadowBlur on
// hundreds of particles per frame is too slow on phones.
const SPRITE = 64;
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(key: string, paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  let img = sprites.get(key);
  if (!img) {
    img = document.createElement('canvas');
    img.width = img.height = SPRITE;
    paint(img.getContext('2d')!);
    sprites.set(key, img);
  }
  return img;
}

export class ParticleField {
  private ctx: CanvasRenderingContext2D;
  private ps: Particle[] = [];
  private raf = 0;
  private last = 0;
  private w = 0;
  private dpr = 1;
  private h = 0;
  private vortexRate = 0;
  private vortexColor = '#7fc4ff';
  private sparkleRate = 0;
  private sparkleColor = '#fff';
  private acc = { vortex: 0, sparkle: 0 };
  private running = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    this.running = true;
    this.wake();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Restarts the frame loop after it fell asleep with nothing to draw. */
  private wake() {
    if (!this.running || this.raf) return;
    this.last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.step(dt);
      this.draw();
      // Nothing alive and nothing emitting: sleep until the next burst, ring or emitter.
      this.raf = this.ps.length || this.vortexRate || this.sparkleRate ? requestAnimationFrame(tick) : 0;
    };
    this.raf = requestAnimationFrame(tick);
  }

  get center() {
    return { x: this.w / 2, y: this.h / 2 };
  }

  /** Glyphs per second spiralling into the centre (0 turns the vortex off). */
  vortex(rate: number, color = this.vortexColor) {
    // Turning the vortex on fills the screen at once instead of waiting for glyphs to arrive.
    if (this.vortexRate === 0 && rate > 0) for (let i = 0; i < 36; i++) this.spawnGlyph(80 + Math.random() * this.maxRadius() * 0.8);
    this.vortexRate = rate;
    this.vortexColor = color;
    for (const p of this.ps) if (p.kind === 'glyph') p.color = color;
    this.wake();
  }

  /** Sparkles per second rising across the screen (0 turns them off). */
  sparkles(rate: number, color = this.sparkleColor) {
    this.sparkleRate = rate;
    this.sparkleColor = color;
    this.wake();
  }

  /** Radial burst of sparks (and optional shards) from a point. */
  burst(x: number, y: number, color: string, count = 80, speed = 700, shards = 0) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, maxLife: 0.6 + Math.random() * 0.7, size: 1.5 + Math.random() * 2.5, color: Math.random() < 0.3 ? '#fff' : color, rot: 0, vrot: 0 });
    }
    for (let i = 0; i < shards; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.2 + Math.random() * 0.6);
      this.add({ kind: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0, maxLife: 1.1 + Math.random() * 0.8, size: 6 + Math.random() * 14, color: Math.random() < 0.4 ? '#fff' : color, rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 14 });
    }
  }

  /** An expanding glowing ring (shockwave) drawn on the canvas. */
  ring(x: number, y: number, color: string, speed = 900) {
    this.add({ kind: 'ring', x, y, vx: speed, vy: 0, life: 0, maxLife: 0.8, size: 10, color, rot: 0, vrot: 0 });
  }

  clear() {
    this.ps = [];
  }

  private add(p: Particle) {
    // Over the cap, the new particle replaces a random one (shift() would copy 900 items).
    if (this.ps.length >= MAX) this.ps[Math.floor(Math.random() * MAX)] = p;
    else this.ps.push(p);
    this.wake();
  }

  private maxRadius() {
    return Math.hypot(this.w, this.h) / 2;
  }

  private spawnGlyph(radius = this.maxRadius() * (0.85 + Math.random() * 0.25)) {
    this.add({
      kind: 'glyph', x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 99,
      size: 14 + Math.random() * 22, color: this.vortexColor, rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 4,
      glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)], angle: Math.random() * Math.PI * 2, radius,
    });
  }

  private spawnSparkle() {
    this.add({
      kind: 'sparkle', x: Math.random() * this.w, y: this.h + 10, vx: (Math.random() - 0.5) * 30, vy: -(60 + Math.random() * 140),
      life: 0, maxLife: 2.5 + Math.random() * 2, size: 3 + Math.random() * 6, color: Math.random() < 0.5 ? '#fff' : this.sparkleColor, rot: 0, vrot: 2 + Math.random() * 3,
    });
  }

  private step(dt: number) {
    this.acc.vortex += this.vortexRate * dt;
    while (this.acc.vortex >= 1) (this.spawnGlyph(), this.acc.vortex--);
    this.acc.sparkle += this.sparkleRate * dt;
    while (this.acc.sparkle >= 1) (this.spawnSparkle(), this.acc.sparkle--);

    const { x: cx, y: cy } = this.center;
    for (const p of this.ps) {
      p.life += dt;
      p.rot += p.vrot * dt;
      switch (p.kind) {
        case 'glyph': {
          // Spiral inward, faster as it gets closer; vanish in the core.
          p.radius! -= (170 + 16000 / (p.radius! + 30)) * dt;
          p.angle! += (1.2 + 320 / (p.radius! + 40)) * dt;
          p.x = cx + Math.cos(p.angle!) * p.radius!;
          p.y = cy + Math.sin(p.angle!) * p.radius! * 0.8;
          if (p.radius! < 18) p.life = p.maxLife;
          break;
        }
        case 'spark':
          p.vx *= 1 - 2.2 * dt;
          p.vy = p.vy * (1 - 2.2 * dt) + 220 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case 'shard':
          p.vx *= 1 - 0.8 * dt;
          p.vy += 520 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case 'sparkle':
          p.x += (p.vx + Math.sin(p.life * 3 + p.y * 0.01) * 20) * dt;
          p.y += p.vy * dt;
          break;
        case 'ring':
          p.size += p.vx * dt;
          break;
      }
    }
    // Drop dead particles in place: a new array every frame feeds the garbage collector.
    let n = 0;
    for (const p of this.ps) if (p.life < p.maxLife) this.ps[n++] = p;
    this.ps.length = n;
  }

  private draw() {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    c.globalCompositeOperation = 'lighter';
    for (const p of this.ps) {
      const fade = p.kind === 'glyph' ? Math.min(1, p.life * 3, p.radius! / 120) : 1 - p.life / p.maxLife;
      c.globalAlpha = Math.max(0, fade);
      switch (p.kind) {
        case 'glyph': {
          const img = sprite(`g|${p.glyph}|${p.color}`, (g) => {
            g.font = `800 ${SPRITE * 0.55}px "Exo 2", serif`;
            g.fillStyle = p.color;
            g.shadowColor = p.color;
            g.shadowBlur = SPRITE * 0.12;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(p.glyph!, SPRITE / 2, SPRITE / 2);
          });
          const d = p.size * 1.8;
          c.setTransform(this.dpr * Math.cos(p.rot), this.dpr * Math.sin(p.rot), -this.dpr * Math.sin(p.rot), this.dpr * Math.cos(p.rot), this.dpr * p.x, this.dpr * p.y);
          c.drawImage(img, -d / 2, -d / 2, d, d);
          c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
          break;
        }
        case 'spark': {
          c.strokeStyle = p.color;
          c.lineWidth = p.size;
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
          c.stroke();
          break;
        }
        case 'shard':
          c.save();
          c.translate(p.x, p.y);
          c.rotate(p.rot);
          c.fillStyle = p.color;
          c.beginPath();
          c.moveTo(0, -p.size);
          c.lineTo(p.size * 0.5, p.size * 0.6);
          c.lineTo(-p.size * 0.6, p.size * 0.3);
          c.closePath();
          c.fill();
          c.restore();
          break;
        case 'sparkle': {
          const img = sprite(`s|${p.color}`, (g) => {
            // four-pointed star with a baked-in glow
            g.translate(SPRITE / 2, SPRITE / 2);
            g.fillStyle = p.color;
            g.shadowColor = p.color;
            g.shadowBlur = SPRITE * 0.15;
            g.beginPath();
            for (let i = 0; i < 8; i++) {
              const r = (i % 2 ? 0.1 : 0.34) * SPRITE;
              const a = (i * Math.PI) / 4;
              g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            g.closePath();
            g.fill();
          });
          const d = p.size * 3 * (0.6 + 0.4 * Math.sin(p.life * p.vrot * 3));
          c.drawImage(img, p.x - d / 2, p.y - d / 2, d, d);
          break;
        }
        case 'ring': {
          // The glow is a radial gradient across the ring, not shadowBlur: blurring an arc
          // up to the screen size every frame took up to 200 ms.
          const lw = 14 * (1 - p.life / p.maxLife) + 1;
          const halo = lw / 2 + RING_GLOW;
          const inner = Math.max(0, p.size - halo);
          const g = c.createRadialGradient(p.x, p.y, inner, p.x, p.y, p.size + halo);
          const mid = (p.size - inner) / (p.size + halo - inner);
          g.addColorStop(0, withAlpha(p.color, 0));
          g.addColorStop(mid * 0.5, withAlpha(p.color, 0.1));
          g.addColorStop(mid, withAlpha(p.color, 0.4));
          g.addColorStop(mid + (1 - mid) * 0.5, withAlpha(p.color, 0.1));
          g.addColorStop(1, withAlpha(p.color, 0));
          c.fillStyle = g;
          c.beginPath();
          c.arc(p.x, p.y, p.size + halo, 0, Math.PI * 2);
          c.arc(p.x, p.y, inner, 0, Math.PI * 2, true);
          c.fill();
          c.strokeStyle = p.color;
          c.lineWidth = lw;
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.stroke();
          break;
        }
      }
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
}
