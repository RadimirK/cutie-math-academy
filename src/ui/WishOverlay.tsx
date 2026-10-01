import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type RefObject } from 'react';
import { content } from '../content/bundle.ts';
import { CharacterCard } from './CharacterCard.tsx';
import { Gem } from './Icons.tsx';
import { Portrait } from './Portrait.tsx';
import { rarityOf } from './rarity.ts';
import { ParticleField } from './wish/particles.ts';
import { isMuted, setMuted, sfxCharge, sfxFlash, sfxFlip, sfxSplash, sfxStar, sfxTier } from './wish/sfx.ts';

export interface PullResult {
  character_id: string;
  rarity: number;
  constellation: number;
  is_new: boolean;
  refund: number;
}

type Phase = 'charge' | 'deal' | 'splash' | 'summary';

// Charge timeline (ms): the sealed card climbs through the rarities it will reach.
const FIRST_TIER = 1300;
const TIER_STEP = 750;
const AFTER_LAST_TIER = 850;
const DEAL_STAGGER = 70;
const FLIP_STEP = 260;

const glow = (r: number) => rarityOf(r).glow;
const cssVars = (vars: Record<string, string>) => vars as CSSProperties;
/** A heroine gets her own splash in a 10-pull when she is 5★ or a new 4★. */
const deservesSplash = (r: PullResult) => r.rarity === 5 || (r.rarity === 4 && r.is_new);

/**
 * Full-screen recruitment: a vortex of math glyphs charges a sealed student card, which climbs
 * through the rarity colours, shatters in a flash, and reveals the heroines (with a splash
 * screen for the best ones). Any tap fast-forwards; "Пропустить" jumps to the results.
 */
export function WishOverlay({ results, onClose }: { results: PullResult[]; onClose(): void }) {
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);
  const single = results.length === 1;
  const best = Math.max(...results.map((r) => r.rarity));

  const [phase, setPhase] = useState<Phase>(reduced ? (single ? 'splash' : 'summary') : 'charge');
  const [tier, setTier] = useState(3);
  const [opened, setOpened] = useState(reduced ? results.length : 0);
  const [splash, setSplash] = useState<number | null>(reduced && single ? 0 : null);
  const [muted, setMutedState] = useState(isMuted);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<ParticleField | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timers = useRef<number[]>([]);
  const nextFlip = useRef(0);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const shake = useCallback((px: number, ms: number) => {
    const frames = Array.from({ length: 8 }, (_, i) => {
      const k = px * (1 - i / 8);
      return { transform: `translate(${(Math.random() - 0.5) * 2 * k}px, ${(Math.random() - 0.5) * 2 * k}px)` };
    });
    rootRef.current?.animate([...frames, { transform: 'none' }], { duration: ms, easing: 'ease-out' });
  }, []);
  const flash = useCallback((ms = 750) => {
    flashRef.current?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
  }, []);

  // Particle field lives for the whole overlay.
  useEffect(() => {
    if (reduced || !canvasRef.current) return;
    const field = new ParticleField(canvasRef.current);
    fieldRef.current = field;
    field.start();
    const onResize = () => field.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      field.stop();
      fieldRef.current = null;
    };
  }, [reduced]);

  // ---- flipping (10-pull) ----
  const flipNext = useCallback(() => {
    const i = nextFlip.current;
    if (i >= results.length) {
      later(500, () => setPhase('summary'));
      return;
    }
    nextFlip.current = i + 1;
    const r = results[i]!;
    setOpened(i + 1);
    later(0, () => sfxFlip(r.rarity));
    const el = cardRefs.current[i];
    const f = fieldRef.current;
    if (el && f && r.rarity >= 4) {
      const b = el.getBoundingClientRect();
      later(180, () => {
        f.burst(b.left + b.width / 2, b.top + b.height / 2, glow(r.rarity), r.rarity === 5 ? 90 : 45, r.rarity === 5 ? 700 : 450);
        if (r.rarity === 5) (f.ring(b.left + b.width / 2, b.top + b.height / 2, glow(5), 700), shake(8, 400));
      });
    }
    if (deservesSplash(r)) later(750, () => setSplash(i));
    else later(FLIP_STEP, flipNext);
  }, [results, later, shake]);

  const reveal = useCallback(() => {
    if (single) {
      setPhase('splash');
      setSplash(0);
      return;
    }
    setPhase('deal');
    nextFlip.current = 0;
    later(results.length * DEAL_STAGGER + 700, flipNext);
  }, [single, results.length, later, flipNext]);

  // ---- charge timeline ----
  useEffect(() => {
    if (reduced) return;
    const tiers = [3, 4, 5].filter((r) => r <= best);
    const boom = FIRST_TIER + (tiers.length - 1) * TIER_STEP + AFTER_LAST_TIER;
    later(0, () => {
      fieldRef.current?.vortex(40, glow(3));
      sfxCharge(boom / 1000);
    });
    tiers.forEach((r, i) =>
      later(FIRST_TIER + i * TIER_STEP, () => {
        const f = fieldRef.current;
        setTier(r);
        sfxTier(r);
        shake(3 + i * 7, 450);
        if (!f) return;
        const c = f.center;
        f.vortex(40 + i * 35, glow(r));
        f.ring(c.x, c.y, glow(r), 800 + i * 300);
        f.burst(c.x, c.y, glow(r), 50 + i * 70, 450 + i * 250);
      }),
    );
    later(boom, () => {
      const f = fieldRef.current;
      sfxFlash(best);
      flash();
      shake(20, 650);
      if (f) {
        const c = f.center;
        f.vortex(0);
        f.clear();
        f.burst(c.x, c.y, glow(best), 240, 1200, 45);
        f.ring(c.x, c.y, '#ffffff', 1600);
        f.ring(c.x, c.y, glow(best), 1100);
      }
      later(220, reveal);
    });
    return clearTimers;
    // The timeline runs once per overlay.
  }, []);

  /** Jump straight to the results, without the remaining splashes. */
  const skipAll = useCallback(() => {
    clearTimers();
    fieldRef.current?.vortex(0);
    if (single) {
      setPhase('splash');
      setSplash(0);
    } else {
      nextFlip.current = results.length;
      setOpened(results.length);
      setSplash(null);
      setPhase('summary');
    }
  }, [clearTimers, single, results.length]);

  const closeSplash = useCallback(() => {
    fieldRef.current?.sparkles(0);
    if (single) return onClose();
    setSplash(null);
    later(250, flipNext);
  }, [single, onClose, later, flipNext]);

  const onTap = () => {
    if (phase === 'charge') {
      clearTimers();
      fieldRef.current?.vortex(0);
      flash(450);
      reveal();
    } else if (phase === 'deal') skipAll();
    else if (phase === 'summary') onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => clearTimers, [clearTimers]);

  const toggleMute = (e: MouseEvent) => {
    e.stopPropagation();
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <div
      ref={rootRef}
      className="wish-night fixed inset-0 z-50 flex animate-fade items-center justify-center overflow-hidden select-none"
      style={cssVars({ '--glow': glow(phase === 'charge' ? tier : best) })}
      onClick={onTap}
      role="dialog"
      aria-label="Результаты набора"
    >
      <div className="wish-stars pointer-events-none absolute inset-0" />
      {/* Above the splash (z-60) so its sparkles show, below the flash (z-70). */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[65] h-full w-full" />

      {phase === 'charge' && <SealedCard tier={tier} />}

      {(phase === 'deal' || phase === 'summary' || (phase === 'splash' && !single)) && (
        <div className="relative z-10 w-full max-w-5xl px-3">
          <div className="grid grid-cols-5 gap-2 sm:gap-4" style={{ perspective: '1000px' }}>
            {results.map((r, i) => (
              <div key={i} ref={(el) => void (cardRefs.current[i] = el)} className={reduced ? '' : 'wish-deal'} style={{ animationDelay: `${i * DEAL_STAGGER}ms` }}>
                <div className="wish-flip relative" data-open={i < opened}>
                  <div className="wish-face wish-face-front">
                    <CharacterCard id={r.character_id} badge={<ResultBadge r={r} />} />
                  </div>
                  <CardBack rarity={r.rarity} className="wish-face absolute inset-0" />
                </div>
              </div>
            ))}
          </div>
          {phase === 'summary' && (
            <p className="mt-8 animate-fade text-center text-sm font-bold text-white/80" style={{ animationDelay: '0.4s' }}>
              нажми, чтобы продолжить
            </p>
          )}
        </div>
      )}

      {splash !== null && <Splash key={splash} r={results[splash]!} field={fieldRef} onDone={closeSplash} />}

      <div ref={flashRef} className="pointer-events-none absolute inset-0 z-[70] bg-white opacity-0" />

      <div className="absolute top-4 right-4 left-4 z-[80] flex justify-between">
        <button onClick={toggleMute} className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-white backdrop-blur hover:bg-white/25" aria-label={muted ? 'Включить звук' : 'Выключить звук'}>
          {muted ? '🔇' : '🔊'}
        </button>
        {(phase === 'charge' || phase === 'deal') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              skipAll();
            }}
            className="rounded-full bg-white/15 px-4 py-1.5 font-display text-sm font-bold text-white italic backdrop-blur hover:bg-white/25"
          >
            Пропустить ⏭
          </button>
        )}
      </div>
      {phase === 'charge' && <span className="absolute bottom-6 z-30 text-sm font-bold text-white/60">нажми, чтобы ускорить</span>}
    </div>
  );
}

/** The sealed card hovering in the vortex, with glyph rings around it. */
function SealedCard({ tier }: { tier: number }) {
  const ring = '∑ ∀ ∃ π ∞ ⊕ λ ∂ √ ≡ ∧ ∨ ¬ ε δ ∈ ⊆ ℕ ℤ Δ φ → ∮ '.repeat(2);
  return (
    <div className="relative z-10 flex items-center justify-center" style={{ perspective: '900px' }}>
      <svg viewBox="0 0 400 400" className="wish-rune wish-spin pointer-events-none absolute h-[26rem] w-[26rem] opacity-80 sm:h-[34rem] sm:w-[34rem]" aria-hidden>
        <defs>
          <path id="wish-ring-a" d="M200,200 m-170,0 a170,170 0 1,1 340,0 a170,170 0 1,1 -340,0" />
        </defs>
        <circle cx="200" cy="200" r="186" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 10" />
        <text fill="currentColor" fontSize="17" fontWeight="800" letterSpacing="3">
          <textPath href="#wish-ring-a">{ring}</textPath>
        </text>
      </svg>
      <svg viewBox="0 0 400 400" className="wish-rune wish-spin-rev pointer-events-none absolute h-[18rem] w-[18rem] opacity-70 sm:h-[24rem] sm:w-[24rem]" aria-hidden>
        <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="60 18 6 18" />
        <circle cx="200" cy="200" r="126" fill="none" stroke="currentColor" strokeWidth="1" />
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="197" y="40" width="6" height="18" fill="currentColor" transform={`rotate(${i * 30} 200 200)`} />
        ))}
      </svg>
      {tier === 5 && <div className="wish-prism pointer-events-none absolute h-72 w-72 rounded-full opacity-70" />}
      <div className="wish-enter">
        <div className="wish-hover" style={{ transformStyle: 'preserve-3d' }}>
          <CardBack rarity={tier} className="h-56 w-40 sm:h-64 sm:w-44" big />
        </div>
      </div>
    </div>
  );
}

function CardBack({ rarity, className = '', big }: { rarity: number; className?: string; big?: boolean }) {
  return (
    <div className={`wish-card-back relative overflow-hidden rounded-xl ${className}`} style={cssVars({ '--glow': glow(rarity) })}>
      {rarity === 5 && <div className="wish-prism absolute -inset-1/2 opacity-40 mix-blend-screen" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className={`font-display font-black tracking-[0.25em] text-white italic ${big ? 'text-3xl' : 'text-xs sm:text-sm'}`}>CMA</span>
      </div>
      <div className="absolute inset-x-0 bottom-2 text-center text-[10px] font-bold tracking-widest text-white/60 max-sm:hidden">{big ? 'STUDENT CARD' : ''}</div>
    </div>
  );
}

/** Character splash: speed lines, a slanted band, the heroine sweeping in, stamped stars. */
function Splash({ r, field, onDone }: { r: PullResult; field: RefObject<ParticleField | null>; onDone(): void }) {
  const ch = content.characters[r.character_id]!;
  const style = rarityOf(r.rarity);
  const nameDelay = 0.45;
  const starsDelay = nameDelay + ch.name.length * 0.06 + 0.2;

  useEffect(() => {
    const ts: number[] = [];
    ts.push(window.setTimeout(() => sfxSplash(r.rarity), 0));
    for (let i = 0; i < r.rarity; i++) ts.push(window.setTimeout(sfxStar, (starsDelay + i * 0.16) * 1000));
    field.current?.sparkles(r.rarity === 5 ? 40 : 22, style.glow);
    const f = field.current;
    if (f) ts.push(window.setTimeout(() => f.burst(f.center.x * 1.3, f.center.y, style.glow, 120, 900), 250));
    return () => ts.forEach(clearTimeout);
  }, [r.rarity, starsDelay, field, style.glow]);

  return (
    <div
      className="fixed inset-0 z-[60] animate-fade overflow-hidden"
      style={{ background: style.bg }}
      onClick={(e) => {
        e.stopPropagation();
        onDone();
      }}
    >
      <div className="rays absolute top-1/2 left-[65%] h-[70rem] w-[70rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-60" style={cssVars({ '--ray': '#ffffff' })} />
      {r.rarity === 5 && <div className="wish-prism absolute top-1/2 left-[65%] h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30" />}
      <div className="wish-speed absolute inset-0 opacity-60" />
      <div className="wish-band absolute top-[50%] -right-[10%] -left-[10%] h-60 bg-ink-900/85 shadow-2xl" style={{ borderTop: `4px solid ${style.glow}`, borderBottom: `4px solid ${style.glow}` }} />
      <div className="wish-hero absolute right-[2%] bottom-0 h-[82vh] w-[min(30rem,72vw)]">
        <Portrait id={r.character_id} variant="stage" className="h-full w-full" />
      </div>
      <div className="absolute top-[50%] left-[6%] max-w-[88%] pt-4 sm:pt-5">
        <div className="flex items-center gap-2">
          <span className="wish-stamp chip -skew-x-12 bg-white/90 text-ink-900" style={{ animationDelay: '0.3s' }}>
            {content.subjects[ch.subject]?.title}
          </span>
          {r.is_new ? (
            <span className="wish-stamp chip -skew-x-12 bg-momo-400 text-white shadow" style={{ animationDelay: '0.35s' }}>
              NEW
            </span>
          ) : (
            <span className="wish-stamp" style={{ animationDelay: '0.35s' }}>
              <ResultBadge r={r} />
            </span>
          )}
        </div>
        <div className="title-display mt-1 text-5xl leading-none text-white [text-shadow:0_4px_0_rgb(0_0_0/0.25)] sm:text-7xl" aria-label={ch.name}>
          {[...ch.name].map((c, i) => (
            <span key={i} className="wish-letter" style={{ animationDelay: `${nameDelay + i * 0.06}s` }}>
              {c}
            </span>
          ))}
        </div>
        <div className="mt-1 text-3xl text-halo-400 [text-shadow:0_0_12px_#ffdb2e] sm:text-4xl" aria-label={`${r.rarity} звезды`}>
          {Array.from({ length: r.rarity }, (_, i) => (
            <span key={i} className="wish-stamp" style={{ animationDelay: `${starsDelay + i * 0.16}s` }}>
              ★
            </span>
          ))}
        </div>
        {ch.description && (
          <p className="mt-2 max-w-md animate-fade text-sm font-bold text-white/85 sm:text-base" style={{ animationDelay: `${starsDelay + r.rarity * 0.16}s` }}>
            {ch.description}
          </p>
        )}
      </div>
      <span className="absolute right-6 bottom-5 z-10 animate-fade text-sm font-bold text-white [text-shadow:0_1px_4px_rgb(0_0_0/0.5)]" style={{ animationDelay: '1.6s' }}>
        нажми, чтобы продолжить
      </span>
    </div>
  );
}

function ResultBadge({ r }: { r: PullResult }) {
  if (r.is_new) return <span className="chip -skew-x-12 bg-momo-400 text-white shadow">NEW</span>;
  if (r.refund)
    return (
      <span className="chip bg-white/95 text-ink-900 shadow">
        +<Gem className="h-3 w-3" />
        {r.refund}
      </span>
    );
  return <span className="chip bg-white/95 text-ink-900 shadow">C{r.constellation}</span>;
}
