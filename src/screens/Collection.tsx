import { useState } from 'react';
import { Link } from 'react-router';
import { content } from '../content/bundle.ts';
import { usePlayer } from '../lib/player.tsx';
import { CharacterCard } from '../ui/CharacterCard.tsx';
import { PageHeader } from '../ui/PageHeader.tsx';

type Filter = 'all' | 3 | 4 | 5;

export function Collection() {
  const { owned } = usePlayer();
  const [filter, setFilter] = useState<Filter>('all');
  const all = Object.values(content.characters)
    .filter((c) => filter === 'all' || c.rarity === filter)
    .sort((a, b) => Number(!!owned[b.id]) - Number(!!owned[a.id]) || b.rarity - a.rarity || a.name.localeCompare(b.name));
  const total = Object.keys(content.characters).length;
  const have = Object.keys(owned).length;

  return (
    <div>
      <PageHeader back="/" backLabel="Лобби" kicker={`Собрано ${have} из ${total}`} title="Героини">
        <div className="flex gap-1">
          {(['all', 5, 4, 3] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`${filter === f ? 'btn-blue' : 'btn-ghost'} !px-4 !py-1.5`}>
              {f === 'all' ? 'Все' : `${f}★`}
            </button>
          ))}
        </div>
      </PageHeader>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {all.map((c) => {
          const o = owned[c.id];
          return (
            <Link key={c.id} to={`/character/${c.id}`} className="block">
              <CharacterCard
                id={c.id}
                locked={!o}
                badge={o && o.copies > 1 ? <span className="chip bg-white/95 text-ink-900 shadow">C{o.copies - 1}</span> : undefined}
                footer={o ? <span className="text-momo-500">♥ {o.affection}</span> : undefined}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
