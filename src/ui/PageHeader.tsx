import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { IconBack } from './Icons.tsx';

/** Screen title in the game's style: a slanted blue back button, then a big italic title. */
export function PageHeader({
  back,
  backLabel,
  kicker,
  title,
  children,
}: {
  back?: string;
  backLabel?: string;
  kicker?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex animate-slide flex-wrap items-center gap-x-4 gap-y-2">
      {back && (
        <Link to={back} title={backLabel} className="group flex h-11 w-12 -skew-x-12 items-center justify-center bg-ba-500 text-white shadow-[0_4px_12px_-4px_rgb(18_140_255/0.7)] transition-colors hover:bg-ba-400">
          <IconBack className="h-6 w-6 skew-x-12 transition-transform group-hover:-translate-x-0.5" />
        </Link>
      )}
      <div className="min-w-0">
        {(kicker || backLabel) && <p className="kicker">{kicker ?? backLabel}</p>}
        <h1 className="title-display text-3xl text-ink-900 sm:text-4xl">{title}</h1>
      </div>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}
