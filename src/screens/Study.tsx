import { Link } from 'react-router';
import { content } from '../content/bundle.ts';
import { usePlayer } from '../lib/player.tsx';
import { PageHeader } from '../ui/PageHeader.tsx';
import { Portrait } from '../ui/Portrait.tsx';

const ACCENTS = ['#128cff', '#ff76a8', '#f2b600', '#7a6cff'];

export function Study() {
  const { progress } = usePlayer();
  const subjects = Object.values(content.subjects).sort((a, b) => a.order - b.order);
  return (
    <div>
      <PageHeader back="/" backLabel="Лобби" kicker="Учёба" title="Выбор предмета" />
      <p className="-mt-3 mb-6 text-ink-700">Героини объяснят теорию, а за решённые задачи ты получишь кристаллы для набора.</p>
      <div className="grid gap-5 md:grid-cols-2">
        {subjects.map((s, i) => {
          const done = s.topics.filter((t) => progress.topics[t] === 'completed').length;
          const accent = ACCENTS[i % ACCENTS.length]!;
          const guides = [...new Set(s.topics.map((t) => content.topics[t]!.main_character))].slice(0, 3);
          return (
            <Link
              key={s.id}
              to={`/subject/${s.id}`}
              className="panel panel-hover group relative flex min-h-48 animate-rise overflow-hidden"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="w-2 shrink-0" style={{ background: accent }} />
              <div
                className="absolute inset-y-0 right-0 w-1/2 opacity-90"
                style={{ background: `linear-gradient(115deg, transparent 0 18%, ${accent}22 18%, ${accent}40 100%)` }}
              />
              <div className="relative min-w-0 flex-1 p-5 pr-24 sm:p-6 sm:pr-28">
                <p className="kicker" style={{ color: accent }}>
                  Предмет {String(i + 1).padStart(2, '0')}
                </p>
                <h2 className="title-display mt-1 text-2xl text-ink-900">{s.title}</h2>
                {s.description && <p className="mt-2 text-sm text-ink-700">{s.description}</p>}
                <div className="mt-5">
                  <div className="mb-1 flex justify-between text-xs font-bold text-ink-500">
                    <span>Прогресс</span>
                    <span>
                      {done} / {s.topics.length}
                    </span>
                  </div>
                  <div className="h-2 -skew-x-12 overflow-hidden bg-ink-100">
                    <div className="h-full" style={{ width: `${(done / Math.max(1, s.topics.length)) * 100}%`, background: accent }} />
                  </div>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 flex">
                {guides.map((g) => (
                  <Portrait key={g} id={g} variant="stage" className="-ml-10 h-48 w-28 transition group-hover:-translate-y-1" />
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
