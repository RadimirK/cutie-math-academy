import { useState } from 'react';
import { content } from '../content/bundle.ts';
import { usePlayer } from '../lib/player.tsx';
import { CharacterCard } from '../ui/CharacterCard.tsx';

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
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="title-display text-3xl">Коллекция</h1>
          <p className="text-white/60">
            Собрано {have} из {total}
          </p>
        </div>
        <div className="ml-auto flex gap-1 rounded-md border border-white/15 p-1">
          {(['all', 5, 4, 3] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1 text-sm font-bold transition-colors ${filter === f ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'}`}
            >
              {f === 'all' ? 'Все' : `${f}★`}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {all.map((c) => {
          const o = owned[c.id];
          return (
            <CharacterCard
              key={c.id}
              id={c.id}
              locked={!o}
              badge={o && o.copies > 1 ? <span className="chip bg-night-950/80 text-gold-200 ring-1 ring-gold-400/40">C{o.copies - 1}</span> : undefined}
              footer={o ? <span className="text-[11px] font-bold text-sakura-300">♥ {o.affection}</span> : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
