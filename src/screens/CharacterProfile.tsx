import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { emotionsOf } from '../art/render.ts';
import { content } from '../content/bundle.ts';
import { sceneOpen, topicOpen } from '../core/progress.ts';
import { usePlayer } from '../lib/player.tsx';
import { IconLock } from '../ui/Icons.tsx';
import { MathText } from '../ui/MathText.tsx';
import { PageHeader } from '../ui/PageHeader.tsx';
import { Portrait, Stars } from '../ui/Portrait.tsx';
import { rarityOf } from '../ui/rarity.ts';
import { SectionTitle } from '../ui/SectionTitle.tsx';

const EMOTION_NAMES: Record<string, string> = {
  smile: 'Улыбка',
  happy: 'Радость',
  thinking: 'Раздумье',
  surprised: 'Удивление',
  embarrassed: 'Смущение',
  sad: 'Грусть',
  angry: 'Обида',
  smug: 'Ухмылка',
  confused: 'Растерянность',
  serious: 'Серьёзность',
  explain: 'Объясняет',
};

/** A heroine's page: her portrait in every emotion, character, affection and affection scenes. */
export function CharacterProfile() {
  const { characterId = '' } = useParams();
  const { progress, owned } = usePlayer();
  const ch = content.characters[characterId];
  const mine = owned[characterId];
  const [emotion, setEmotion] = useState('smile');
  const [said, setSaid] = useState<number | null>(null);

  // A clicked quote is spoken: a bubble over the portrait and a moving mouth for a while.
  useEffect(() => {
    if (said === null) return;
    const t = setTimeout(() => setSaid(null), 4000);
    return () => clearTimeout(t);
  }, [said]);

  if (!ch) return <p>Нет такой героини.</p>;
  const r = rarityOf(ch.rarity);
  const subject = content.subjects[ch.subject];
  const kicker = `${subject?.title ?? ch.subject} · ${r.label}`;

  if (!mine) {
    const banners = Object.values(content.banners).filter((b) => b.pool[ch.rarity].includes(ch.id));
    const leads = ch.topics.map((id) => content.topics[id]).filter((t) => t?.main_character === ch.id).map((t) => t!);
    return (
      <div>
        <PageHeader back="/collection" backLabel="Героини" kicker={kicker} title="???" />
        <div className="panel mx-auto flex max-w-xl flex-col items-center gap-4 p-6 text-center">
          <Portrait id={ch.id} className="aspect-[3/4] w-48 rounded-lg brightness-[0.55] grayscale" />
          <p className="font-bold text-ink-700">Эта героиня ещё не в команде.</p>
          {leads.length > 0 && (
            <p className="text-sm text-ink-500">
              Присоединится, когда начнёшь тему{' '}
              {leads.map((t, i) => (
                <span key={t.fullId}>
                  {i > 0 && (i === leads.length - 1 ? ' или ' : ', ')}
                  {topicOpen(content, progress, t.fullId) ? (
                    <Link to={`/topic/${t.fullId}`} className="font-bold text-ba-500 hover:underline">
                      «{t.title}»
                    </Link>
                  ) : (
                    <b className="text-ink-700">«{t.title}»</b>
                  )}
                </span>
              ))}
              .
            </p>
          )}
          {banners.length > 0 && (
            <>
              <p className="text-sm text-ink-500">Её можно встретить в наборе: {banners.map((b) => `«${b.title}»`).join(', ')}.</p>
              <Link to="/gacha" className="btn-gold">
                К набору
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const emotions = ch.look ? emotionsOf(ch.look) : Object.keys(ch.sprites);
  const gates = [...ch.affection_scenes].sort((a, b) => a.threshold - b.threshold);
  const next = gates.find((g) => g.threshold > mine.affection);
  const prev = [...gates].reverse().find((g) => g.threshold <= mine.affection)?.threshold ?? 0;
  const topics = ch.topics.map((id) => content.topics[id]).filter((t) => !!t);

  return (
    <div>
      <PageHeader back="/collection" backLabel="Героини" kicker={kicker} title={ch.name}>
        {mine.copies > 1 && <span className="chip bg-ink-900 text-white">C{mine.copies - 1}</span>}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div
            className="sky relative h-[24rem] overflow-hidden lg:h-[30rem] rounded-lg border-2 shadow-lg"
            style={{ borderColor: r.glow, boxShadow: `0 12px 30px -14px ${r.glow}` }}
          >
            {said !== null && (
              <div key={said} className="absolute inset-x-3 top-3 z-10 animate-fade rounded-lg bg-white/95 p-3 text-sm text-ink-900 shadow-lg">
                <MathText text={ch.quotes[said]!} />
              </div>
            )}
            <Portrait
              key={ch.id}
              id={ch.id}
              emotion={emotion}
              talking={said !== null}
              variant="stage"
              className="absolute inset-x-0 bottom-0 h-[92%] animate-fade"
            />
            <div className="absolute bottom-2 left-2 -skew-x-12 rounded-sm bg-ink-900/70 px-2">
              <Stars n={ch.rarity} className="skew-x-12 text-sm" />
            </div>
          </div>
          {emotions.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {emotions.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmotion(e)}
                  className={`${emotion === e ? 'btn-blue' : 'btn-ghost'} !px-3 !py-1 !text-xs`}
                >
                  {EMOTION_NAMES[e] ?? e}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <section className="panel p-5">
            {ch.description && <p className="text-lg text-ink-700 italic">{ch.description}</p>}
            {ch.traits.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {ch.traits.map((t) => (
                  <span key={t} className="chip bg-ba-50 text-ba-700 ring-1 ring-ba-200">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-4 text-sm text-ink-500">
              {topics.length > 0 ? 'Темы: ' : 'Помогает во всём предмете '}
              {topics.length > 0
                ? topics.map((t, i) => (
                    <span key={t.fullId}>
                      {i > 0 && ', '}
                      {topicOpen(content, progress, t.fullId) ? (
                        <Link to={`/topic/${t.fullId}`} className="font-bold text-ba-500 hover:underline">
                          {t.title}
                        </Link>
                      ) : (
                        <b className="text-ink-700">{t.title}</b>
                      )}
                    </span>
                  ))
                : subject && (
                    <Link to={`/subject/${subject.id}`} className="font-bold text-ba-500 hover:underline">
                      «{subject.title}»
                    </Link>
                  )}
            </p>
          </section>

          <section>
            <SectionTitle>Симпатия</SectionTitle>
            <div className="panel p-5">
              <div className="flex items-baseline gap-3">
                <span className="title-display text-4xl text-momo-500">♥ {mine.affection}</span>
                {next && <span className="font-bold text-ink-500">до новой сцены: {next.threshold - mine.affection}</span>}
              </div>
              {next && (
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-momo-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-momo-400 to-momo-500 transition-[width] duration-700"
                    style={{ width: `${(100 * (mine.affection - prev)) / (next.threshold - prev)}%` }}
                  />
                </div>
              )}
              <p className="mt-3 text-sm text-ink-500">
                Растёт, когда решаешь задачи {topics.length > 0 ? 'по её темам' : 'по её предмету'}: столько сердец, сколько звёзд сложности у задачи.
              </p>
            </div>
          </section>

          <section>
            <SectionTitle>Сцены симпатии</SectionTitle>
            {gates.length === 0 ? (
              <p className="panel p-5 text-ink-500">Личных сцен у {ch.name} пока нет.</p>
            ) : (
              <ol className="space-y-2.5">
                {gates.map((g, i) => {
                  const s = content.scenes[g.scene]!;
                  const done = progress.scenes[g.scene]?.status === 'completed';
                  const reached = mine.affection >= g.threshold;
                  const open = sceneOpen(content, progress, owned, g.scene);
                  return (
                    <li key={g.scene} className={`panel flex animate-slide items-center gap-4 overflow-hidden pr-4 ${open ? '' : 'opacity-60'}`} style={{ animationDelay: `${i * 60}ms` }}>
                      <span
                        className={`grid h-16 w-16 shrink-0 place-items-center font-display text-xl font-black text-white italic ${done ? 'bg-emerald-400' : 'bg-momo-400'}`}
                        style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}
                      >
                        {done ? '✓' : '♥'}
                      </span>
                      <div className="flex-1 py-2">
                        <div className="font-display text-xs font-bold tracking-widest text-momo-500 uppercase">♥ {g.threshold}</div>
                        <div className="font-bold text-ink-900">{reached ? (s.title ?? s.id) : '???'}</div>
                      </div>
                      {open ? (
                        <Link to={`/scene/${g.scene}`} className={done ? 'btn-ghost' : 'btn-gold'}>
                          {done ? 'Пересмотреть' : 'Смотреть'}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-1 text-sm font-bold text-ink-500">
                          <IconLock /> {reached ? `тема «${content.topics[s.topic]?.title}» закрыта` : `♥ ${mine.affection} / ${g.threshold}`}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {ch.quotes.length > 0 && (
            <section>
              <SectionTitle>Реплики</SectionTitle>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {ch.quotes.map((q, i) => (
                  <li key={i}>
                    <button
                      onClick={() => setSaid(i)}
                      title="Пусть скажет"
                      className={`panel panel-hover block h-full w-full border-l-4 p-3 text-left text-sm text-ink-700 ${said === i ? '!border-l-momo-400' : '!border-l-ba-300'}`}
                    >
                      <MathText text={q} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
