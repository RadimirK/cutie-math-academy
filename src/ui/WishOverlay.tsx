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

const SUMMON_MS = 2100;

/** Full-screen recruitment animation: a halo in the colour of the best rarity opens up, then the cards. */
export function WishOverlay({ results, onClose }: { results: PullResult[]; onClose(): void }) {
  const [phase, setPhase] = useState<'summon' | 'reveal'>('summon');
  const best = Math.max(...results.map((r) => r.rarity));
  const color = rarityOf(best).glow;

  useEffect(() => {
    const t = setTimeout(() => setPhase('reveal'), SUMMON_MS);
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
      className="fixed inset-0 z-50 flex animate-fade items-center justify-center overflow-hidden bg-gradient-to-b from-ba-100 via-white to-ba-50"
      onClick={() => (phase === 'summon' ? setPhase('reveal') : onClose())}
      role="dialog"
      aria-label="Результаты набора"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ backgroundImage: 'linear-gradient(rgb(18 140 255 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(18 140 255 / 0.07) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />
      {phase === 'summon' ? (
        <>
          <div className="rays absolute top-1/2 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-40" style={{ ['--ray' as string]: color }} />
          <div className="summon-ring relative h-64 w-64" style={{ transformStyle: 'preserve-3d' }}>
            <div className="absolute inset-0 rounded-full border-[10px]" style={{ borderColor: color, boxShadow: `0 0 40px ${color}, inset 0 0 40px ${color}` }} />
            <div className="absolute inset-6 rounded-full border-2 border-dashed" style={{ borderColor: color }} />
            <div className="absolute inset-[42%] rounded-full bg-white" style={{ boxShadow: `0 0 30px 12px ${color}` }} />
          </div>
          <div className="flash pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle, #fff 30%, ${color}88 60%, #fff 90%)` }} />
          <span className="absolute right-6 bottom-6 text-sm font-bold text-ink-500">нажми, чтобы пропустить</span>
        </>
      ) : sorted.length === 1 ? (
        <SingleReveal r={sorted[0]!} />
      ) : (
        <div className="relative w-full max-w-5xl px-4">
          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {sorted.map((r, i) => (
              <div key={i} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
                <CharacterCard id={r.character_id} badge={<ResultBadge r={r} />} />
              </div>
            ))}
          </div>
          <p className="mt-8 animate-fade text-center text-sm font-bold text-ink-500" style={{ animationDelay: '1.2s' }}>
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
      <div className="rays absolute top-1/2 left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-50" style={{ ['--ray' as string]: style.glow }} />
      <CharacterCard id={r.character_id} className="w-60 animate-rise sm:w-72" badge={<ResultBadge r={r} />} />
      <div className="relative mt-6 animate-rise text-center" style={{ animationDelay: '200ms' }}>
        <Stars n={r.rarity} className="text-2xl" />
        <div className="title-display text-4xl text-ink-900">{ch.name}</div>
        {ch.description && <p className="mx-auto mt-2 max-w-sm text-sm text-ink-700">{ch.description}</p>}
      </div>
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
