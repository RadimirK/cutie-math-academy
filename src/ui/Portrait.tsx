import type { CSSProperties } from 'react';
import { content, lookSpriteUrl, spriteUrl } from '../content/bundle.ts';
import { haloColor, rarityOf } from './rarity.ts';

// A character is drawn from her sprite file if there is one, else from her generated pixel
// portrait (`look`), else as a white silhouette with a halo.

/** A tilted halo ring with small spikes, drawn in the heroine's colour. */
export function Halo({ color, className = '', style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 120 40" className={className} style={{ filter: `drop-shadow(0 0 6px ${color})`, ...style }} aria-hidden>
      <ellipse cx="60" cy="20" rx="44" ry="11" fill="none" stroke={color} strokeWidth="4" />
      <ellipse cx="60" cy="20" rx="44" ry="11" fill="none" stroke="#fff" strokeWidth="1.2" strokeOpacity="0.8" />
      {[18, 42, 60, 78, 102].map((x, i) => (
        <path key={x} d={`M${x} ${i % 2 ? 7 : 11} l3 -7 l3 7 z`} fill={color} transform={i === 2 ? 'translate(-3 -2)' : 'translate(-3 0)'} />
      ))}
    </svg>
  );
}

function BustSilhouette({ halo }: { halo: string }) {
  return (
    <>
      <svg
        viewBox="0 0 100 120"
        className="absolute inset-x-0 bottom-0 h-[84%] w-full"
        style={{ filter: 'drop-shadow(0 2px 6px rgb(28 47 74 / 0.35))' }}
        aria-hidden
      >
        {/* long hair behind */}
        <path d="M22 50 C 20 22, 80 22, 78 50 C 80 70, 84 92, 76 104 L 24 104 C 16 92, 20 70, 22 50 Z" fill="#fff" opacity="0.55" />
        {/* shoulders */}
        <path d="M12 120 C 14 96, 32 86, 50 86 C 68 86, 86 96, 88 120 Z" fill="#fff" />
        <rect x="43" y="68" width="14" height="20" rx="6" fill="#fff" />
        {/* head + fringe */}
        <circle cx="50" cy="50" r="21" fill="#fff" />
        <path d="M28 48 C 28 28, 72 28, 72 48 C 64 38, 56 42, 50 36 C 44 42, 36 38, 28 48 Z" fill="#f4f8fc" />
        {/* ribbon */}
        <path d="M66 30 l 12 -8 l -2 12 z M66 30 l 4 12 l 8 -6 z" fill="#fff" />
      </svg>
      <Halo color={halo} className="absolute top-[23%] left-1/2 w-[46%] -translate-x-1/2 -rotate-6" />
    </>
  );
}

function StandingSilhouette({ glow, halo }: { glow: string; halo: string }) {
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 200 420" className="h-full w-full" aria-hidden style={{ filter: `drop-shadow(0 0 1.5px ${glow}) drop-shadow(0 8px 18px rgb(28 47 74 / 0.3))` }}>
        <defs>
          <linearGradient id="stand-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.75" stopColor="#fff" stopOpacity="0.92" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {/* twin tails */}
        <path d="M58 70 C 30 90, 26 170, 40 230 C 46 190, 52 130, 70 96 Z" fill="#fff" opacity="0.7" />
        <path d="M142 70 C 170 90, 174 170, 160 230 C 154 190, 148 130, 130 96 Z" fill="#fff" opacity="0.7" />
        {/* dress */}
        <path d="M72 130 C 80 120, 120 120, 128 130 L 138 210 L 168 330 C 140 344, 60 344, 32 330 L 62 210 Z" fill="url(#stand-fill)" />
        {/* collar and tie, school-uniform style */}
        <path d="M86 126 L100 146 L114 126 Z" fill={glow} opacity="0.35" />
        <path d="M97 142 L103 142 L106 176 L100 184 L94 176 Z" fill={glow} opacity="0.6" />
        {/* arms */}
        <path d="M72 132 C 56 160, 52 200, 58 236 L 66 234 C 64 200, 70 170, 80 146 Z" fill="url(#stand-fill)" />
        <path d="M128 132 C 144 160, 148 200, 142 236 L 134 234 C 136 200, 130 170, 120 146 Z" fill="url(#stand-fill)" />
        {/* legs */}
        <rect x="80" y="330" width="14" height="80" rx="7" fill="url(#stand-fill)" />
        <rect x="106" y="330" width="14" height="80" rx="7" fill="url(#stand-fill)" />
        {/* neck + head */}
        <rect x="92" y="104" width="16" height="26" rx="7" fill="#fff" />
        <circle cx="100" cy="76" r="36" fill="#fff" />
        <path d="M62 76 C 60 36, 140 36, 138 76 C 126 58, 112 66, 100 54 C 88 66, 74 58, 62 76 Z" fill="#f4f8fc" />
        <path d="M126 40 l 20 -12 l -3 20 z M126 40 l 6 20 l 14 -10 z" fill="#fff" />
      </svg>
      <Halo color={halo} className="absolute top-0 left-1/2 w-[52%] -translate-x-1/2 animate-halo" />
    </div>
  );
}

/**
 * variant "card": bust on a rarity gradient (collection, recruitment results, icons).
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
  const pixel = url ? undefined : lookSpriteUrl(id, emotion ?? 'smile', variant === 'stage' ? 'full' : 'bust');
  const halo = haloColor(id);

  if (variant === 'stage') {
    return (
      <div className={`relative ${className}`} style={style}>
        {url ? (
          <img src={url} alt={ch?.name ?? id} className="h-full w-full object-contain" style={{ filter: 'drop-shadow(0 10px 24px rgb(28 47 74 / 0.3))' }} />
        ) : pixel ? (
          <img
            src={pixel}
            alt={ch?.name ?? id}
            className="h-full w-full object-contain object-bottom [image-rendering:pixelated]"
            style={{ filter: 'drop-shadow(0 10px 24px rgb(28 47 74 / 0.3))' }}
          />
        ) : (
          <StandingSilhouette glow={r.glow} halo={halo} />
        )}
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: r.bg, ...style }}>
      {/* diagonal light stripes */}
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: 'repeating-linear-gradient(120deg, transparent 0 14px, rgb(255 255 255 / 0.35) 14px 20px, transparent 20px 44px)' }}
      />
      {url ? (
        <img src={url} alt={ch?.name ?? id} className="absolute inset-0 h-full w-full object-cover object-top" />
      ) : pixel ? (
        <img src={pixel} alt={ch?.name ?? id} className="absolute inset-0 h-full w-full object-cover object-top [image-rendering:pixelated]" />
      ) : (
        <BustSilhouette halo={halo} />
      )}
    </div>
  );
}

export function Stars({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex text-halo-400 [text-shadow:0_0_1px_#b88a00,0_1px_2px_rgb(28_47_74/0.35)] ${className}`} aria-label={`${n} звезды`}>
      {'★'.repeat(n)}
    </span>
  );
}
