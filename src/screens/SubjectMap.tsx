import { Fragment } from 'react';
import { Link, useParams } from 'react-router';
import { content } from '../content/bundle.ts';
import { topicStatus } from '../core/progress.ts';
import { usePlayer } from '../lib/player.tsx';
import { IconBack, IconLock } from '../ui/Icons.tsx';
import { Portrait } from '../ui/Portrait.tsx';

const STATUS = {
  locked: { label: 'закрыта', chip: 'bg-white/10 text-white/50', ring: 'opacity-55' },
  new: { label: 'новая', chip: 'bg-sakura-500 text-white', ring: 'ring-2 ring-sakura-400 shadow-[0_0_30px_-6px_rgb(247_80_127)]' },
  in_progress: { label: 'в процессе', chip: 'bg-r4/30 text-r4', ring: 'ring-2 ring-r4/70' },
  completed: { label: 'пройдена', chip: 'bg-emerald-400/20 text-emerald-300', ring: 'ring-1 ring-emerald-300/50' },
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
      <Link to="/study" className="btn-ghost !px-3 !py-1">
        <IconBack /> Учёба
      </Link>
      <h1 className="title-display mt-3 mb-8 text-3xl">{subject.title}</h1>
      <div className="flex flex-col items-center">
        {layers.map((layer, i) => (
          <Fragment key={i}>
            {i > 0 && <div className="h-10 w-px bg-gradient-to-b from-white/40 to-white/5" />}
            <div className="flex flex-wrap justify-center gap-5">
              {layer.map((id) => {
                const t = content.topics[id]!;
                const st = topicStatus(content, progress, id);
                const card = (
                  <div className={`panel relative flex w-80 items-center gap-4 overflow-hidden p-4 ${STATUS[st].ring}`}>
                    <Portrait id={t.main_character} className="h-20 w-16 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                      <span className={`chip mb-1 ${STATUS[st].chip}`}>
                        {st === 'locked' && <IconLock className="h-3 w-3" />}
                        {STATUS[st].label}
                      </span>
                      <div className="title-display text-base leading-tight break-words hyphens-auto" lang="ru">
                        {t.title}
                      </div>
                      <div className="mt-0.5 text-xs text-white/50">
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
