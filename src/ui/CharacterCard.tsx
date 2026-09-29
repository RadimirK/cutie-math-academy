import type { CSSProperties, ReactNode } from 'react';
import { content } from '../content/bundle.ts';
import { Portrait, Stars } from './Portrait.tsx';
import { rarityOf } from './rarity.ts';

/** Gacha-style character card: rarity frame, portrait, name plate, stars and an optional badge. */
export function CharacterCard({
  id,
  locked,
  badge,
  footer,
  className = '',
  style,
}: {
  id: string;
  locked?: boolean;
  badge?: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const ch = content.characters[id];
  const r = rarityOf(ch?.rarity);
  return (
    <div
      className={`group relative rounded-2xl p-[2px] transition duration-200 ${locked ? '' : 'hover:-translate-y-1'} ${className}`}
      style={{
        background: locked ? 'rgb(255 255 255 / 0.12)' : `linear-gradient(160deg, ${r.glow}, #ffffff66 45%, ${r.glow})`,
        boxShadow: locked ? undefined : `0 10px 30px -10px ${r.glow}`,
        ...style,
      }}
    >
      <div className="relative overflow-hidden rounded-[14px] bg-night-900">
        <Portrait id={id} className={`aspect-[3/4] w-full ${locked ? 'brightness-[0.25] grayscale' : ''}`} />
        {ch?.rarity === 5 && !locked && (
          <div
            className="pointer-events-none absolute inset-0 animate-shimmer opacity-60 mix-blend-overlay"
            style={{ backgroundImage: 'linear-gradient(110deg, transparent 35%, #fff 50%, transparent 65%)', backgroundSize: '200% 100%' }}
          />
        )}
        {badge && <div className="absolute top-2 right-2">{badge}</div>}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-950 via-night-950/80 to-transparent px-2.5 pt-8 pb-2">
          <div className="truncate font-display text-sm font-bold">{locked ? '???' : ch?.name}</div>
          <div className="flex items-center justify-between">
            <Stars n={ch?.rarity ?? 3} className="text-xs" />
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
