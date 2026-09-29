import { Link, useParams } from 'react-router';
import { content } from '../content/bundle.ts';
import { templateUnlocked, topicOpen } from '../core/progress.ts';
import { usePlayer } from '../lib/player.tsx';
import { Gem, IconLock } from '../ui/Icons.tsx';
import { Difficulty } from '../ui/Difficulty.tsx';
import { PageHeader } from '../ui/PageHeader.tsx';
import { Portrait, Stars } from '../ui/Portrait.tsx';

export function TopicPage() {
  const { topicId = '' } = useParams();
  const { progress } = usePlayer();
  const topic = content.topics[topicId];
  if (!topic) return <p>Нет такой темы.</p>;
  if (!topicOpen(content, progress, topicId)) return <p>Эта тема пока закрыта.</p>;
  const heroine = content.characters[topic.main_character]!;
  const scenes = [...topic.main_scenes, ...topic.scenes.filter((s) => !topic.main_scenes.includes(s))];
  const rewards = content.economy.reward_by_difficulty;

  return (
    <div>
      <PageHeader back={`/subject/${topic.subject}`} backLabel={content.subjects[topic.subject]?.title} kicker="Тема" title={topic.title} />

      <section className="sky relative mb-8 flex min-h-44 overflow-hidden rounded-lg border-2 border-white p-6 shadow-[0_10px_30px_-14px_rgb(18_140_255/0.6)]">
        <div className="relative max-w-lg self-start rounded-md bg-white/85 p-4 backdrop-blur-sm">
          {topic.description && <p className="text-ink-700">{topic.description}</p>}
          <p className="mt-2 text-sm text-ink-500">
            Ведёт тему: <b className="text-ink-900">{heroine.name}</b> <Stars n={heroine.rarity} className="text-xs" />
          </p>
        </div>
        <Portrait id={heroine.id} variant="stage" className="absolute right-2 -bottom-12 hidden h-72 w-48 sm:block" />
      </section>

      <SectionTitle>Сюжет</SectionTitle>
      <ol className="mb-10 space-y-2.5">
        {scenes.map((id, i) => {
          const s = content.scenes[id]!;
          const p = progress.scenes[id];
          const main = topic.main_scenes.includes(id);
          // Main scenes are played in order.
          const prevDone = i === 0 || !main || progress.scenes[topic.main_scenes[i - 1]!]?.status === 'completed';
          const done = p?.status === 'completed';
          const label = done ? 'Пересмотреть' : p ? 'Продолжить' : 'Начать';
          return (
            <li key={id} className={`panel flex animate-slide items-center gap-4 overflow-hidden pr-4 ${prevDone ? '' : 'opacity-55'}`} style={{ animationDelay: `${i * 60}ms` }}>
              <span
                className={`grid h-16 w-16 shrink-0 place-items-center font-display text-xl font-black italic ${done ? 'bg-emerald-400 text-white' : main ? 'bg-ba-500 text-white' : 'bg-momo-400 text-white'}`}
                style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}
              >
                {done ? '✓' : main ? String(i + 1).padStart(2, '0') : '♡'}
              </span>
              <div className="flex-1 py-2">
                <div className="font-display text-xs font-bold tracking-widest text-ba-500 uppercase">{main ? `Эпизод ${i + 1}` : 'Бонусная сцена'}</div>
                <div className="font-bold text-ink-900">{s.title ?? s.id}</div>
              </div>
              {prevDone ? (
                <Link to={`/scene/${id}`} className={done ? 'btn-ghost' : 'btn-gold'}>
                  {label}
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-sm font-bold text-ink-500">
                  <IconLock /> после эпизода {i}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <SectionTitle>Задачи</SectionTitle>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topic.templates.map((id) => {
          const t = content.templates[id]!;
          const open = templateUnlocked(content, progress, id);
          const inner = (
            <>
              <div className="flex items-start gap-2">
                <span className="font-bold text-ink-900">{t.title ?? t.id}</span>
                {t.starred && <span className="chip ml-auto shrink-0 bg-halo-400 text-ink-900">✶ особая</span>}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <Difficulty n={t.difficulty} />
                <span className="flex items-center gap-1 font-display font-extrabold text-ink-900">
                  {open ? <Gem className="h-4 w-4" /> : <IconLock />} {rewards[t.difficulty as 1]}
                </span>
              </div>
            </>
          );
          return open ? (
            <li key={id}>
              <Link to={`/problem/${id}`} className="panel panel-hover block border-l-4 !border-l-ba-500 p-4">
                {inner}
              </Link>
            </li>
          ) : (
            <li key={id} className="panel border-l-4 !border-l-ink-300 p-4 opacity-55" title="Откроется после сцены">
              {inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-3 font-display text-xl font-extrabold text-ink-900 italic">
      <span className="h-5 w-2 -skew-x-12 bg-ba-500" />
      {children}
      <span className="h-px flex-1 bg-ink-100" />
    </h2>
  );
}
