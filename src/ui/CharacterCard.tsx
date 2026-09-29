import type { CSSProperties, ReactNode } from 'react';
import { content } from '../content/bundle.ts';
import { Portrait, Stars } from './Portrait.tsx';
import { rarityOf } from './rarity.ts';

/** Student-card style: portrait on a rarity gradient, stars in the corner, white name plate. */
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
      className={`group relative overflow-hidden rounded-lg border-2 bg-white transition duration-200 ${locked ? 'border-ink-100' : 'hover:-translate-y-1'} ${className}`}
      style={{
        borderColor: locked ? undefined : r.glow,
        boxShadow: locked ? undefined : `0 8px 22px -10px ${r.glow}`,
        ...style,
      }}
    >
      <div className="relative">
        <Portrait id={id} className={`aspect-[3/4] w-full ${locked ? 'brightness-[0.55] grayscale' : ''}`} />
        {ch?.rarity === 5 && !locked && (
          <div
            className="pointer-events-none absolute inset-0 animate-shimmer opacity-70 mix-blend-soft-light"
            style={{ backgroundImage: 'linear-gradient(110deg, transparent 35%, #fff 50%, transparent 65%)', backgroundSize: '200% 100%' }}
          />
        )}
        <div className="absolute top-1.5 left-1.5 -skew-x-12 rounded-sm bg-ink-900/70 px-1.5 leading-tight">
          <Stars n={ch?.rarity ?? 3} className="skew-x-12 text-[11px]" />
        </div>
        {badge && <div className="absolute top-1.5 right-1.5">{badge}</div>}
      </div>
      <div className="relative border-t-2 bg-white px-2.5 pt-1 pb-1.5" style={{ borderColor: locked ? 'var(--color-ink-100)' : r.glow }}>
        <div className="truncate font-display text-sm font-extrabold text-ink-900 italic">{locked ? '???' : ch?.name}</div>
        <div className="flex h-4 items-center justify-between text-[11px] font-bold text-ink-500">
          <span>{content.subjects[ch?.subject ?? '']?.title ?? ''}</span>
          {footer}
        </div>
      </div>
    </div>
  );
}
