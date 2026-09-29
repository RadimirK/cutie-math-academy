import { Link, useParams } from 'react-router';
import { content } from '../content/bundle.ts';
import { templateUnlocked, topicOpen } from '../core/progress.ts';
import { usePlayer } from '../lib/player.tsx';
import { Gem, IconBack, IconLock } from '../ui/Icons.tsx';
import { Portrait, Stars } from '../ui/Portrait.tsx';
import { rarityOf } from '../ui/rarity.ts';

export function TopicPage() {
  const { topicId = '' } = useParams();
  const { progress } = usePlayer();
  const topic = content.topics[topicId];
  if (!topic) return <p>Нет такой темы.</p>;
  if (!topicOpen(content, progress, topicId)) return <p>Эта тема пока закрыта.</p>;
  const heroine = content.characters[topic.main_character]!;
  const glow = rarityOf(heroine.rarity).glow;
  const scenes = [...topic.main_scenes, ...topic.scenes.filter((s) => !topic.main_scenes.includes(s))];
  const rewards = content.economy.reward_by_difficulty;

  return (
    <div>
      <Link to={`/subject/${topic.subject}`} className="btn-ghost !px-3 !py-1">
        <IconBack /> {content.subjects[topic.subject]?.title}
      </Link>

      <section className="panel relative mt-4 mb-8 flex min-h-48 overflow-hidden p-6">
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 85% 50%, ${glow}55, transparent 55%)` }} />
        <div className="relative max-w-lg">
          <p className="text-sm font-bold tracking-widest text-sakura-300 uppercase">Тема</p>
          <h1 className="title-display text-3xl sm:text-4xl">{topic.title}</h1>
          {topic.description && <p className="mt-2 text-white/70">{topic.description}</p>}
          <p className="mt-3 text-sm text-white/60">
            Ведёт тему: <b className="text-white">{heroine.name}</b> <Stars n={heroine.rarity} className="text-xs" />
          </p>
        </div>
        <Portrait id={heroine.id} variant="stage" className="absolute -right-4 -bottom-10 hidden h-72 w-48 sm:block" />
      </section>

      <h2 className="title-display mb-3 text-xl">Сюжет</h2>
      <ol className="mb-10 space-y-3">
        {scenes.map((id, i) => {
          const s = content.scenes[id]!;
          const p = progress.scenes[id];
          const main = topic.main_scenes.includes(id);
          // Main scenes are played in order.
          const prevDone = i === 0 || !main || progress.scenes[topic.main_scenes[i - 1]!]?.status === 'completed';
          const done = p?.status === 'completed';
          const label = done ? 'Пересмотреть' : p ? 'Продолжить' : 'Начать';
          return (
            <li key={id} className={`panel flex items-center gap-4 p-3 pr-4 ${prevDone ? '' : 'opacity-50'}`}>
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-display font-bold ${
                  done ? 'bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-300/50' : 'bg-sakura-500/25 text-sakura-200 ring-1 ring-sakura-300/50'
                }`}
              >
                {done ? '✓' : main ? i + 1 : '♡'}
              </span>
              <div className="flex-1">
                <div className="text-xs font-bold text-white/40 uppercase">{main ? `Глава ${i + 1}` : 'Бонусная сцена'}</div>
                <div className="font-bold">{s.title ?? s.id}</div>
              </div>
              {prevDone ? (
                <Link to={`/scene/${id}`} className={done ? 'btn-ghost' : 'btn-pink !px-5 !py-2 text-sm'}>
                  {label}
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-sm text-white/50">
                  <IconLock /> после главы {i}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <h2 className="title-display mb-3 text-xl">Задачи</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topic.templates.map((id) => {
          const t = content.templates[id]!;
          const open = templateUnlocked(content, progress, id);
          const inner = (
            <>
              <div className="flex items-start gap-2">
                <span className="font-bold">{t.title ?? t.id}</span>
                {t.starred && <span className="chip ml-auto bg-gold-400/20 text-gold-300 ring-1 ring-gold-400/40">✶ особая</span>}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="tracking-widest text-sakura-300" title={`сложность ${t.difficulty}`}>
                  {'◆'.repeat(t.difficulty)}
                  <span className="text-white/15">{'◆'.repeat(5 - t.difficulty)}</span>
                </span>
                <span className="flex items-center gap-1 font-display font-bold text-gold-200">
                  {open ? <Gem className="h-4 w-4" /> : <IconLock />} {rewards[t.difficulty as 1]}
                </span>
              </div>
            </>
          );
          return open ? (
            <li key={id}>
              <Link to={`/problem/${id}`} className="panel panel-hover block p-4">
                {inner}
              </Link>
            </li>
          ) : (
            <li key={id} className="panel p-4 opacity-45" title="Откроется после сцены">
              {inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
