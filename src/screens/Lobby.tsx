import { Link } from 'react-router';
import { content } from '../content/bundle.ts';
import { usePlayer } from '../lib/player.tsx';
import { IconBook, IconCards, IconWish } from '../ui/Icons.tsx';
import { Portrait, Stars } from '../ui/Portrait.tsx';

/** Home screen: the "assistant" heroine standing in the sky, her message bubble and the main menu. */
export function Lobby() {
  const { owned, progress, profile } = usePlayer();
  const ownedIds = Object.keys(owned);
  // The assistant is the rarest owned heroine, or the first topic's guide for newcomers.
  const assistant =
    [...ownedIds].sort((a, b) => (content.characters[b]?.rarity ?? 0) - (content.characters[a]?.rarity ?? 0))[0] ??
    Object.values(content.topics)[0]?.main_character ??
    Object.keys(content.characters)[0]!;
  const ch = content.characters[assistant]!;
  const topics = Object.keys(content.topics);
  const doneTopics = topics.filter((t) => progress.topics[t] === 'completed').length;
  const banner = Object.values(content.banners)[0];

  return (
    <section className="sky relative overflow-hidden rounded-xl border-2 border-white shadow-[0_16px_50px_-20px_rgb(18_140_255/0.6)]">
      <div className="relative grid min-h-[36rem] lg:grid-cols-[1.15fr_1fr]">
        <div className="relative flex min-h-[28rem] items-end justify-center">
          <Portrait id={assistant} variant="stage" className="relative h-[27rem] w-64 animate-float lg:h-[34rem] lg:w-80" />

          <div className="absolute bottom-6 left-4 max-w-[17rem] animate-rise sm:left-6">
            <div className="flex items-center gap-2 rounded-t-lg bg-momo-400 px-3 py-1 text-xs font-extrabold text-white">
              <span className="h-2 w-2 rounded-full bg-white" /> MomoTalk
            </div>
            <div className="rounded-b-lg bg-white p-3 text-sm shadow-lg">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-display font-extrabold text-ink-900 italic">{ch.name}</span>
                <Stars n={ch.rarity} className="text-xs" />
              </div>
              <p className="text-ink-700">{ch.description ?? 'Привет! Готов заниматься?'}</p>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col justify-center gap-3 p-4 sm:p-6 lg:pr-8">
          <div className="mb-2 animate-slide">
            <span className="plate font-display text-xs font-bold tracking-[0.2em] uppercase">
              <span>Академия</span>
            </span>
            <h1 className="title-display mt-2 text-3xl text-ink-900 drop-shadow-[0_2px_0_#fff] sm:text-4xl">
              {profile ? `С возвращением, ${profile.nickname}!` : 'Добро пожаловать, ученик!'}
            </h1>
          </div>
          <MenuTile
            to="/study"
            icon={<IconBook className="h-7 w-7" />}
            title="Учёба"
            subtitle="Сюжет с героинями и задачи за кристаллы"
            meta={`Пройдено тем: ${doneTopics} / ${topics.length}`}
            delay={60}
          />
          <MenuTile
            to="/gacha"
            icon={<IconWish className="h-7 w-7" />}
            title="Набор"
            subtitle={banner?.title ?? 'Баннеры'}
            meta={`Шанс 5★ ${((banner?.rates[5] ?? 0) * 100).toFixed(1)}% · гарантия на ${content.economy.pity.five_star}-й`}
            accent
            delay={120}
          />
          <MenuTile
            to="/collection"
            icon={<IconCards className="h-7 w-7" />}
            title="Героини"
            subtitle="Коллекция, созвездия и симпатия"
            meta={`Собрано: ${ownedIds.length} / ${Object.keys(content.characters).length}`}
            delay={180}
          />
        </div>
      </div>
    </section>
  );
}

function MenuTile(props: { to: string; icon: React.ReactNode; title: string; subtitle: string; meta: string; accent?: boolean; delay: number }) {
  return (
    <Link
      to={props.to}
      className="group relative flex animate-slide items-center gap-4 bg-white/95 py-3 pr-5 pl-6 shadow-[0_6px_18px_-8px_rgb(28_47_74/0.35)] transition hover:translate-x-1 hover:bg-white"
      style={{ clipPath: 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)', animationDelay: `${props.delay}ms` }}
    >
      <div className={`grid h-12 w-12 shrink-0 -skew-x-12 place-items-center ${props.accent ? 'bg-halo-400 text-ink-900' : 'bg-ba-500 text-white'}`}>
        <span className="skew-x-12">{props.icon}</span>
      </div>
      <div className="min-w-0">
        <div className="title-display text-xl text-ink-900">{props.title}</div>
        <div className="text-sm text-ink-700">{props.subtitle}</div>
        <div className="mt-0.5 text-xs font-bold text-ba-500">{props.meta}</div>
      </div>
      <span className="ml-auto font-display text-2xl font-black text-ink-300 transition group-hover:translate-x-1 group-hover:text-ba-500">›</span>
    </Link>
  );
}
