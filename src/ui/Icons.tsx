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

export const IconHome = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </svg>
);
export const IconMenu = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

/** The in-game currency glyph: a faceted blue-pink crystal. */
export const Gem = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <defs>
      <linearGradient id="gem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9fe8ff" />
        <stop offset="0.55" stopColor="#3eaaff" />
        <stop offset="1" stopColor="#ff7ac0" />
      </linearGradient>
    </defs>
    <path d="M12 1.5l7.5 7-7.5 13.5L4.5 8.5z" fill="url(#gem)" />
    <path d="M12 1.5l3 7-3 13.5-3-13.5zM4.5 8.5h15" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.9" strokeLinejoin="round" />
  </svg>
);
