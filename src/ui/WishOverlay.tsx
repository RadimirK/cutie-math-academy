import { useEffect, useState } from 'react';
import { content } from '../content/bundle.ts';
import { CharacterCard } from './CharacterCard.tsx';
import { Gem } from './Icons.tsx';
import { Stars } from './Portrait.tsx';
import { rarityOf } from './rarity.ts';

export interface PullResult {
  character_id: string;
  rarity: number;
  constellation: number;
  is_new: boolean;
  refund: number;
}

const METEOR_MS = 2100;

/** Full-screen pull animation: a meteor tinted by the best rarity, then the cards. */
export function WishOverlay({ results, onClose }: { results: PullResult[]; onClose(): void }) {
  const [phase, setPhase] = useState<'meteor' | 'reveal'>('meteor');
  const best = Math.max(...results.map((r) => r.rarity));
  const color = rarityOf(best).glow;

  useEffect(() => {
    const t = setTimeout(() => setPhase('reveal'), METEOR_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sorted = [...results].sort((a, b) => b.rarity - a.rarity);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade items-center justify-center overflow-hidden bg-night-950/95 backdrop-blur"
      onClick={() => (phase === 'meteor' ? setPhase('reveal') : onClose())}
      role="dialog"
      aria-label="Результаты призыва"
    >
      {phase === 'meteor' ? (
        <>
          <div className="absolute top-1/2 left-1/2">
            <div className="meteor relative">
              <div
                className="absolute top-1/2 right-1/2 h-[3px] w-[45vw] origin-right rotate-45 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${color})` }}
              />
              <div
                className="h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                style={{ boxShadow: `0 0 30px 10px ${color}, 0 0 90px 30px ${color}` }}
              />
            </div>
          </div>
          <div className="flash pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle, #fff, ${color} 40%, transparent 75%)` }} />
          <span className="absolute right-6 bottom-6 text-sm text-white/50">нажми, чтобы пропустить</span>
        </>
      ) : sorted.length === 1 ? (
        <SingleReveal r={sorted[0]!} />
      ) : (
        <div className="w-full max-w-5xl px-4">
          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {sorted.map((r, i) => (
              <div key={i} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
                <CharacterCard id={r.character_id} badge={<ResultBadge r={r} />} />
              </div>
            ))}
          </div>
          <p className="mt-8 animate-fade text-center text-sm text-white/50" style={{ animationDelay: '1.2s' }}>
            нажми, чтобы продолжить
          </p>
        </div>
      )}
    </div>
  );
}

function SingleReveal({ r }: { r: PullResult }) {
  const ch = content.characters[r.character_id]!;
  const style = rarityOf(r.rarity);
  return (
    <div className="relative flex flex-col items-center">
      <div className="rays absolute top-1/2 left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-60" style={{ ['--ray' as string]: style.glow }} />
      <CharacterCard id={r.character_id} className="w-60 animate-rise sm:w-72" badge={<ResultBadge r={r} />} />
      <div className="relative mt-6 animate-rise text-center" style={{ animationDelay: '200ms' }}>
        <Stars n={r.rarity} className="text-2xl" />
        <div className="title-display text-4xl" style={{ color: style.glow, textShadow: `0 0 24px ${style.glow}` }}>
          {ch.name}
        </div>
        {ch.description && <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">{ch.description}</p>}
      </div>
    </div>
  );
}

function ResultBadge({ r }: { r: PullResult }) {
  if (r.is_new) return <span className="chip bg-sakura-500 text-white shadow-[0_0_12px_rgb(247_80_127)]">NEW</span>;
  if (r.refund)
    return (
      <span className="chip bg-night-950/80 text-gold-200">
        +<Gem className="h-3 w-3" />
        {r.refund}
      </span>
    );
  return <span className="chip bg-night-950/80 text-white">C{r.constellation}</span>;
}
