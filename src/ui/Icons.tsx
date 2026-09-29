// Small inline icons (stroke-based, inherit currentColor).
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IconBook = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    <path d="M9 8h7M9 11.5h5" />
  </svg>
);
export const IconWish = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 2.5l2.6 5.6 6 .7-4.5 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.4 8.8l6-.7z" />
  </svg>
);
export const IconCards = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="3" y="6" width="12" height="15" rx="2" />
    <path d="M8 3h11a2 2 0 0 1 2 2v13" />
  </svg>
);
export const IconLock = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const IconBack = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

/** The in-game currency glyph. */
export const Gem = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <defs>
      <linearGradient id="gem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff0c7" />
        <stop offset="0.5" stopColor="#ff9fc0" />
        <stop offset="1" stopColor="#b98cff" />
      </linearGradient>
    </defs>
    <path d="M12 1.5l3 7.5 7.5 3-7.5 3-3 7.5-3-7.5-7.5-3 7.5-3z" fill="url(#gem)" />
  </svg>
);
