import { Fragment } from 'react';
import { Link, useParams } from 'react-router';
import { content } from '../content/bundle.ts';
import { topicStatus } from '../core/progress.ts';
import { usePlayer } from '../lib/player.tsx';
import { IconLock } from '../ui/Icons.tsx';
import { PageHeader } from '../ui/PageHeader.tsx';
import { Portrait } from '../ui/Portrait.tsx';

const STATUS = {
  locked: { label: 'закрыта', chip: 'bg-ink-100 text-ink-500', ring: 'opacity-60 grayscale' },
  new: { label: 'NEW', chip: 'bg-halo-400 text-ink-900', ring: 'ring-2 ring-ba-400 shadow-[0_0_24px_-6px_rgb(18_140_255/0.8)]' },
  in_progress: { label: 'в процессе', chip: 'bg-ba-100 text-ba-700', ring: 'ring-2 ring-ba-300' },
  completed: { label: 'CLEAR', chip: 'bg-emerald-100 text-emerald-700', ring: '' },
} as const;

/** Topic graph drawn as layers: a topic sits one layer below its deepest prerequisite. */
export function SubjectMap() {
  const { subjectId = '' } = useParams();
  const { progress } = usePlayer();
  const subject = content.subjects[subjectId];
  if (!subject) return <p>Нет такого предмета.</p>;

  const depth = new Map<string, number>();
  const depthOf = (id: string): number => {
    if (!depth.has(id)) {
      const reqs = (content.topics[id]?.requires ?? []).filter((r) => content.topics[r]?.subject === subjectId);
      depth.set(id, reqs.length ? 1 + Math.max(...reqs.map(depthOf)) : 0);
    }
    return depth.get(id)!;
  };
  const layers: string[][] = [];
  for (const t of subject.topics) (layers[depthOf(t)] ??= []).push(t);

  return (
    <div>
      <PageHeader back="/study" backLabel="Учёба" kicker="Карта тем" title={subject.title} />
      <div className="flex flex-col items-center">
        {layers.map((layer, i) => (
          <Fragment key={i}>
            {i > 0 && <div className="h-10 border-l-2 border-dashed border-ba-300" />}
            <div className="flex flex-wrap justify-center gap-5">
              {layer.map((id) => {
                const t = content.topics[id]!;
                const st = topicStatus(content, progress, id);
                const card = (
                  <div className={`panel relative flex w-80 items-center gap-4 overflow-hidden p-3 pr-4 ${STATUS[st].ring}`}>
                    <span className="absolute top-0 right-0 bg-ba-500 px-2 py-0.5 font-display text-[10px] font-bold tracking-widest text-white italic" style={{ clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%)' }}>
                      {String(subject.topics.indexOf(id) + 1).padStart(2, '0')}
                    </span>
                    <Portrait id={t.main_character} className="h-20 w-16 shrink-0 rounded-md" />
                    <div className="min-w-0">
                      <span className={`chip mb-1 ${STATUS[st].chip}`}>
                        {st === 'locked' && <IconLock className="h-3 w-3" />}
                        {STATUS[st].label}
                      </span>
                      <div className="title-display text-base leading-tight break-words text-ink-900 hyphens-auto" lang="ru">
                        {t.title}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-500">
                        {st === 'locked'
                          ? `нужно: ${t.requires.map((r) => content.topics[r]?.title).join(', ')}`
                          : `ведёт ${content.characters[t.main_character]?.name}`}
                      </div>
                    </div>
                  </div>
                );
                return st === 'locked' ? (
                  <div key={id}>{card}</div>
                ) : (
                  <Link key={id} to={`/topic/${id}`} className="transition hover:-translate-y-1">
                    {card}
                  </Link>
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
