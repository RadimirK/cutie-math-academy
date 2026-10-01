import { Link } from 'react-router';

/** Wordmark in the spirit of the game's logo. */
export function Logo({ large = false }: { large?: boolean }) {
  return (
    <Link to="/" className={`relative inline-flex flex-col leading-none ${large ? 'items-center' : 'mr-2'}`}>
      <span className={`font-display font-black text-ink-900 italic ${large ? 'text-5xl sm:text-6xl' : 'text-lg'}`}>
        Cutie <span className="text-ba-500">Math</span>
      </span>
      <span className={`font-display font-bold tracking-[0.35em] text-ba-500 uppercase italic ${large ? 'mt-1 text-base' : 'text-[9px]'}`}>Academy</span>
    </Link>
  );
}
