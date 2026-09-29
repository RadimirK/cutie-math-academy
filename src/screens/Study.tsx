import { Link } from 'react-router';
import { content } from '../content/bundle.ts';
import { usePlayer } from '../lib/player.tsx';
import { Portrait } from '../ui/Portrait.tsx';

const ACCENTS = ['#ff7aa6', '#b98cff', '#5ab8ff', '#ffc24d'];

export function Study() {
  const { progress } = usePlayer();
  const subjects = Object.values(content.subjects).sort((a, b) => a.order - b.order);
  return (
    <div>
      <h1 className="title-display mb-1 text-3xl">Учёба</h1>
      <p className="mb-6 text-white/60">Выбери предмет: героини объяснят теорию, а за решённые задачи ты получишь валюту для призыва.</p>
      <div className="grid gap-5 md:grid-cols-2">
        {subjects.map((s, i) => {
          const done = s.topics.filter((t) => progress.topics[t] === 'completed').length;
          const accent = ACCENTS[i % ACCENTS.length]!;
          const guides = [...new Set(s.topics.map((t) => content.topics[t]!.main_character))].slice(0, 3);
          return (
            <Link key={s.id} to={`/subject/${s.id}`} className="panel panel-hover group relative flex min-h-44 overflow-hidden p-6">
              <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at 100% 0%, ${accent}66, transparent 60%)` }} />
              <div className="relative flex-1 pr-24">
                <h2 className="title-display text-2xl">{s.title}</h2>
                {s.description && <p className="mt-2 text-sm text-white/70">{s.description}</p>}
                <div className="mt-5">
                  <div className="mb-1 flex justify-between text-xs font-bold text-white/60">
                    <span>Прогресс</span>
                    <span>
                      {done} / {s.topics.length}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${(done / Math.max(1, s.topics.length)) * 100}%`, background: accent }} />
                  </div>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 flex">
                {guides.map((g) => (
                  <Portrait key={g} id={g} variant="stage" className="-ml-10 h-44 w-28 transition group-hover:-translate-y-1" />
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
