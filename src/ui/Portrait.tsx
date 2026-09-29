import type { CSSProperties } from 'react';
import { content, spriteUrl } from '../content/bundle.ts';
import { rarityOf } from './rarity.ts';

// Until real art exists, characters are drawn as silhouettes tinted by rarity.

function BustSilhouette() {
  return (
    <svg viewBox="0 0 100 120" className="absolute inset-x-0 bottom-0 h-[88%] w-full" aria-hidden>
      <defs>
        <linearGradient id="bust-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* long hair behind */}
      <path d="M22 50 C 20 22, 80 22, 78 50 C 80 70, 84 92, 76 104 L 24 104 C 16 92, 20 70, 22 50 Z" fill="#fff" opacity="0.35" />
      {/* shoulders */}
      <path d="M12 120 C 14 96, 32 86, 50 86 C 68 86, 86 96, 88 120 Z" fill="url(#bust-fill)" />
      <rect x="43" y="68" width="14" height="20" rx="6" fill="url(#bust-fill)" />
      {/* head + fringe */}
      <circle cx="50" cy="50" r="21" fill="url(#bust-fill)" />
      <path d="M28 48 C 28 28, 72 28, 72 48 C 64 38, 56 42, 50 36 C 44 42, 36 38, 28 48 Z" fill="#fff" />
      {/* ribbon */}
      <path d="M66 30 l 12 -8 l -2 12 z M66 30 l 4 12 l 8 -6 z" fill="#fff" opacity="0.9" />
    </svg>
  );
}

function StandingSilhouette({ glow }: { glow: string }) {
  return (
    <svg viewBox="0 0 200 420" className="h-full w-full" aria-hidden style={{ filter: `drop-shadow(0 0 28px ${glow})` }}>
      <defs>
        <linearGradient id="stand-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* twin tails */}
      <path d="M58 70 C 30 90, 26 170, 40 230 C 46 190, 52 130, 70 96 Z" fill="#fff" opacity="0.45" />
      <path d="M142 70 C 170 90, 174 170, 160 230 C 154 190, 148 130, 130 96 Z" fill="#fff" opacity="0.45" />
      {/* dress */}
      <path d="M72 130 C 80 120, 120 120, 128 130 L 138 210 L 168 330 C 140 344, 60 344, 32 330 L 62 210 Z" fill="url(#stand-fill)" />
      {/* arms */}
      <path d="M72 132 C 56 160, 52 200, 58 236 L 66 234 C 64 200, 70 170, 80 146 Z" fill="url(#stand-fill)" />
      <path d="M128 132 C 144 160, 148 200, 142 236 L 134 234 C 136 200, 130 170, 120 146 Z" fill="url(#stand-fill)" />
      {/* legs */}
      <rect x="80" y="330" width="14" height="80" rx="7" fill="url(#stand-fill)" />
      <rect x="106" y="330" width="14" height="80" rx="7" fill="url(#stand-fill)" />
      {/* neck + head */}
      <rect x="92" y="104" width="16" height="26" rx="7" fill="url(#stand-fill)" />
      <circle cx="100" cy="76" r="36" fill="#fff" opacity="0.95" />
      <path d="M62 76 C 60 36, 140 36, 138 76 C 126 58, 112 66, 100 54 C 88 66, 74 58, 62 76 Z" fill="#fff" />
      <path d="M126 40 l 20 -12 l -3 20 z M126 40 l 6 20 l 14 -10 z" fill="#fff" />
    </svg>
  );
}

/**
 * variant "card": framed bust on a rarity gradient (collection, gacha results, icons).
 * variant "stage": full-height standing figure with no frame (VN, lobby, banners).
 */
export function Portrait({
  id,
  emotion,
  variant = 'card',
  className = '',
  style,
}: {
  id: string;
  emotion?: string;
  variant?: 'card' | 'stage';
  className?: string;
  style?: CSSProperties;
}) {
  const ch = content.characters[id];
  const r = rarityOf(ch?.rarity);
  const url = spriteUrl(id, emotion);

  if (variant === 'stage') {
    return (
      <div className={`relative ${className}`} style={style}>
        {url ? (
          <img src={url} alt={ch?.name ?? id} className="h-full w-full object-contain" style={{ filter: `drop-shadow(0 0 24px ${r.glow}88)` }} />
        ) : (
          <StandingSilhouette glow={r.glow} />
        )}
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: r.bg, ...style }}>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(2px 2px at 20% 25%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 75% 15%, #fff 50%, transparent 51%), radial-gradient(2px 2px at 85% 60%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 35% 70%, #fff 50%, transparent 51%)',
        }}
      />
      {url ? <img src={url} alt={ch?.name ?? id} className="absolute inset-0 h-full w-full object-cover object-top" /> : <BustSilhouette />}
    </div>
  );
}

export function Stars({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex text-gold-300 drop-shadow-[0_0_4px_rgb(255_194_77/0.8)] ${className}`} aria-label={`${n} звезды`}>
      {'★'.repeat(n)}
    </span>
  );
}
